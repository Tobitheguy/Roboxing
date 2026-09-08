import type { Metadata, Viewport } from "next";
import { Oswald } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { roboxingLocalization } from "@/components/auth/localization";

import "./globals.css";

/**
 * The site's ONE typeface, per Tobias's instruction of 2026-09-08: "generell
 * braucht die gesamte seite die gleiche font type". Oswald carries display
 * AND body — Inter was removed rather than left loaded-but-unused, so the
 * decision is enforced by the bundle, not by discipline. Geist Mono stays for
 * stream keys and timecodes only: those are technical strings where digit
 * alignment is function, not typography.
 */
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    // "The record of", not "live" — the site holds no broadcast rights, and
    // the default title is quoted verbatim in search results. It should make
    // the claim the site can keep.
    default: "Roboxing — Humanoid Robot Fighting",
    template: "%s · Roboxing",
  },
  description:
    "The record of humanoid robot fighting: every league, every event, full fight cards, results and standings — URKL, CyberHero, the World Humanoid Robot Games and more.",
};

export const viewport: Viewport = {
  // Matches --color-canvas. This is the colour a mobile browser paints its
  // chrome and its overscroll with, so a stale value here shows up as a dark
  // band above a light page on every phone.
  themeColor: "#F6F6F3",
  colorScheme: "light",
};

/**
 * The root layout holds only what EVERY response needs: fonts, the theme
 * class, and the Clerk provider.
 *
 * Chrome lives one level down, because the two halves of the site want
 * opposite things. `(app)` gets the header, footer and demo banner — and the
 * gate that says you must be signed in with a second factor. `(auth)` gets a
 * full-bleed screen with no navigation at all, because a sign-in page with a
 * menu bar invites you to go somewhere else, and there is nowhere else to go.
 *
 * Putting the gate in `(app)/layout.tsx` rather than here is the point: a new
 * page added under `(app)` is protected by existing, not by remembering.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Clerk's own UI is themed to match rather than left on its defaults —
    // a white sign-in modal on a near-black broadcast site reads as a
    // third-party interruption, which is exactly what a payment flow must not.
    <ClerkProvider
      // Signing out lands on the landing page, which is what "home" means now.
      //
      // This said /sign-in, and the reasoning was sound at the time: every
      // route required an account, so "/" would have bounced straight back to
      // the sign-in form and the direct link avoided a round trip. Once "/"
      // became a public landing page that reasoning inverted — signing out now
      // drops someone onto a login form for a product they have just left,
      // instead of the page that explains why they might come back.
      afterSignOutUrl="/"
      // Clerk holds an auto-generated name for this instance and prints it in
      // the largest text on the sign-in screen. See localization.ts — this is
      // a patch over a dashboard setting, not the fix.
      localization={roboxingLocalization}
      // Clerk's own UI, themed to the light palette. The `dark` theme import
      // is gone: leaving it on would render a near-black sign-in card in the
      // middle of a white page, which reads as a third-party interruption
      // rather than part of the site.
      appearance={{
        variables: {
          colorPrimary: "#14161A",
          colorBackground: "#FFFFFF",
          // No `colorText` — Core 3 dropped it from Variables. Clerk derives
          // its foreground from colorBackground, which is white here, so the
          // text comes out dark on its own.
          colorDanger: "#C4162B",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html
        lang="en"
        // No `dark` class any more. It used to be set unconditionally so
        // shadcn's `dark:` variants resolved against a permanently dark
        // palette; the palette is light now, and leaving it on would apply
        // dark-mode overrides on top of light tokens — which is how you get a
        // white page with dark-grey form controls on it.
        className={`${oswald.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
