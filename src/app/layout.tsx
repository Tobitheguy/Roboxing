import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

import { roboxingLocalization } from "@/components/auth/localization";

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
    default: "Roboxing — Live Robot Fighting",
    template: "%s · Roboxing",
  },
  description:
    "Live humanoid robot combat: streams, league standings, team rosters, and full fight history.",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
  colorScheme: "dark",
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
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#C8FF00",
          colorBackground: "#15151C",
          colorDanger: "#FF4D4F",
          borderRadius: "0.5rem",
        },
      }}
    >
      {/* `dark` is set permanently, not toggled: the product is video-first and
          a light chrome competes with the player. Both themes resolve to the
          same tokens in globals.css — the class exists so shadcn's `dark:`
          variants land on the right side of their conditionals. */}
      <html
        lang="en"
        className={`dark ${oswald.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
