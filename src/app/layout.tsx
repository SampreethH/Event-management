import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { ConciergeDock } from "@/components/layout/ConciergeDock";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

// Type roles: Cormorant Garamond for editorial headlines (Clash Display stays as
// the geometric fallback), Satoshi for UI/body (Fontshare, ITF free licence),
// Plus Jakarta Sans for pricing chips and buttons, JetBrains Mono for order IDs
// and timers. Cormorant and JetBrains Mono are self-hosted variable fonts (OFL)
// so builds never depend on a Google Fonts fetch.
const clash = localFont({
  src: [
    { path: "./fonts/ClashDisplay-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ClashDisplay-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ClashDisplay-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-clash",
  display: "swap",
});
const serif = localFont({
  src: [
    { path: "./fonts/CormorantGaramond-Variable.woff2", weight: "300 700", style: "normal" },
    { path: "./fonts/CormorantGaramond-Italic-Variable.woff2", weight: "300 700", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});
const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});
const sub = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-sub", display: "swap" });
const mono = localFont({ src: "./fonts/JetBrainsMono-Variable.woff2", weight: "100 800", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Festoon — Party-in-a-Box & celebration concierge", template: "%s · Festoon" },
  description: "Design custom snack & favor boxes in 3D, get SOS party kits in 60–90 minutes, and split the bill with your crew.",
  applicationName: "Festoon",
  appleWebApp: { capable: true, title: "Festoon", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F7F2E9",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${clash.variable} ${serif.variable} ${satoshi.variable} ${sub.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <div className="ambient-stage" aria-hidden />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
          Skip to content
        </a>
        <ChromeGate>
          <Navbar />
        </ChromeGate>
        <main id="main">{children}</main>
        <ChromeGate>
          <SiteFooter />
          <ConciergeDock />
        </ChromeGate>
      </body>
    </html>
  );
}
