import type { Metadata, Viewport } from "next";
import {
  Archivo,
  Archivo_Black,
  JetBrains_Mono,
  Noto_Sans_SC,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { roboxingLocalization } from "@/components/auth/localization";

import "./globals.css";

/**
 * ONE FAMILY, TWO ROLES, PLUS A MONO.
 *
 *   Archivo Black  display. Results, machine names, headlines. Always
 *                  uppercase, never a sentence.
 *   Archivo        every sentence. Never a headline.
 *   Mono           the telemetry ticker, IDs, timecodes, scores, chips.
 *
 * WHY NOT ANTON, WHICH DIR_03 SPECIFIED.
 *
 * Two separate complaints from Tobias had one root. First, headlines were
 * hard to read and the letters grew together. Anton is extremely condensed
 * AND very heavy, which is exactly the combination that closes up at small
 * sizes; the tracking bump and the disabled synthetic bold were treating a
 * symptom.
 *
 * Second, the drawn R in the logo did not look like the R beside it. That is
 * not a "logo font vs site font" problem, which is normal and near-universal
 * (Netflix, Spotify and Airbnb all do it). It is a PROPORTION problem: the
 * mark is a square, wide, heavy R and Anton's R is roughly 55% of that width.
 * Two R's at opposite ends of the width axis, ten pixels apart.
 *
 * Archivo Black answers both. Its proportions sit with the mark, it stays
 * open at small sizes, and it is the black cut of the family that already
 * sets the body -- so the site drops from two type families to one.
 *
 * The cost was accepted knowingly: Archivo Black sets about 60% wider than
 * Anton, so the display scale came down a step and some long league names now
 * wrap. A headline that wraps beats a headline nobody can read.
 *
 * NOTO SANS SC IS NOT OPTIONAL. Neither Latin face covers CJK, and this
 * record is full of Chinese: machine names (斗牛士), pilot names (陆鑫), a
 * league entry keyword (报名). Without a CJK fallback on every stack those
 * render as boxes — which on a site whose whole claim is knowing which machine
 * is which would be worse than ugly.
 */
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
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
  /* The phone's browser chrome, which sits directly above the header and is
     the first colour anyone sees. It was still the retired light canvas, so
     a dark site opened under a cream bar. */
  themeColor: "#0B0F10",
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
        className={`${archivoBlack.variable} ${archivo.variable} ${jetbrainsMono.variable} ${notoSC.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
