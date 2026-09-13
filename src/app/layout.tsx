import type { Metadata, Viewport } from "next";
import {
  Anton,
  Archivo,
  JetBrains_Mono,
  Noto_Sans_SC,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { roboxingLocalization } from "@/components/auth/localization";

import "./globals.css";

/**
 * Three faces, three jobs, no overlap (DIR_03).
 *
 * The site ran on Oswald alone — one face for everything, which was a
 * deliberate instruction and the right call while the design was monochrome
 * and typographic. The new identity separates the jobs instead:
 *
 *   Anton    display only. Results, machine names, headlines. Always
 *            uppercase, never a sentence. Single weight — it only has one.
 *   Archivo  every sentence. Never a headline.
 *   Mono     the telemetry ticker, IDs, timecodes, scores, confidence chips.
 *
 * NOTO SANS SC IS NOT OPTIONAL. Anton has no CJK coverage at all, and this
 * record is full of Chinese: machine names (斗牛士), pilot names (陆鑫), a
 * league entry keyword (报名). Without a CJK fallback on every stack those
 * render as boxes — which on a site whose whole claim is knowing which machine
 * is which would be worse than ugly.
 */
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Loaded for its glyph coverage, not its personality. `preload: false` because
 * the subset is large and most pages never need it — the browser fetches it
 * when a CJK character actually appears rather than on every first paint.
 */
const notoSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
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
      /*
       * Clerk's own UI, themed to DIR_03.
       *
       * These four variables are the ONLY styling hook that works — see
       * components/auth/appearance.tsx for why the `elements` overrides were
       * deleted. They were still set to the retired light palette, so the
       * sign-in card rendered as a white rounded box in the middle of a void
       * page: a third-party interruption rather than part of the site.
       *
       * `colorDanger` is amber, NOT the signal red. Red on this site means
       * broadcasting right now, and a form validation error is not that. This
       * is the one place the rule would have been broken by inattention rather
       * than by choice.
       *
       * No `colorText`: Core 3 dropped it. Clerk derives the foreground from
       * colorBackground, which is the dark panel here, so the text comes out
       * light on its own.
       */
      appearance={{
        variables: {
          colorPrimary: "#00E5D0",
          colorBackground: "#14191A",
          colorDanger: "#FFB300",
          borderRadius: "0",
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
        className={`${anton.variable} ${archivo.variable} ${jetbrainsMono.variable} ${notoSC.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
