import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kubera — Personal Finance",
  description: "A calm, personal finance workspace for tracking money with clarity.",
  applicationName: "Kubera",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kubera",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/INR/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/INR/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/INR/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F5F3" },
    { media: "(prefers-color-scheme: dark)", color: "#101314" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const appearanceBootScript = `
(function () {
  try {
    var key = "kubera-appearance";
    var pref = localStorage.getItem(key);
    if (pref !== "light" && pref !== "dark" && pref !== "system") {
      var legacy = localStorage.getItem("kubera-theme");
      pref = legacy === "light" || legacy === "dark" ? legacy : "system";
    }
    var dark =
      pref === "dark" ||
      (pref !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} font-sans antialiased paper-surface`}>
        <Script
          id="kubera-appearance-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: appearanceBootScript }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
