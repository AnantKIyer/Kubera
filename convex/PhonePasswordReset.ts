import { PhoneConfig } from "@convex-dev/auth/server";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { normalizePhone } from "../lib/auth/normalize";

function generateOtp(): string {
  const random: RandomReader = {
    read(bytes) {
      crypto.getRandomValues(bytes);
    },
  };
  return generateRandomString(random, "0123456789", 6);
}

export const PhonePasswordReset: PhoneConfig = {
  id: "phone-otp-reset",
  type: "phone",
  maxAge: 60 * 15,
  options: {},
  generateVerificationToken: async () => generateOtp(),
  normalizeIdentifier: normalizePhone,
  sendVerificationRequest: async ({ identifier, token }) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !authToken || !from) {
      console.log(`[Kubera DEV] Password reset OTP for ${identifier}: ${token}`);
      return;
    }

    const credentials = btoa(`${sid}:${authToken}`);
    const body = new URLSearchParams({
      To: identifier,
      From: from,
      Body: `Your Kubera password reset code is ${token}. Valid for 15 minutes.`,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("Twilio SMS failed:", detail);
      throw new Error("Could not send verification code. Try again later.");
    }
  },
};
