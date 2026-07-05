import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll send a code to your registered phone number
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  );
}
