import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

/**
 * Display face. Condensed and heavy — it carries robot names, scores, and the
 * countdown, which are the things a visitor should read first from across a room.
 */
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** UI face for everything that is prose rather than a scoreline. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Timecodes, stream keys, robot model numbers. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Robox — Live Robot Fighting",
    template: "%s · Robox",
  },
  description:
    "Live humanoid robot combat: streams, league standings, team rosters, and full fight history.",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `dark` is set permanently, not toggled: the product is video-first and a
    // light chrome competes with the player. Both themes resolve to the same
    // tokens in globals.css — the class exists so shadcn's `dark:` variants
    // land on the right side of their conditionals.
    <html
      lang="en"
      className={`dark ${oswald.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
