import type { Metadata } from "next";
import Link from "next/link";

import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Roboxing collects, who processes it, and how to get it deleted. Cookieless analytics, no advertising network, no tracking pixels.",
};

/**
 * The privacy policy, and it is written from the code rather than from a
 * template.
 *
 * Every claim below was checked against this repository before it was written
 * down, because a policy that describes a site we do not run is worse than no
 * policy: it is a false statement about data handling, made in the one document
 * a regulator reads first.
 *
 * The three that were verified and are worth not breaking:
 *
 * 1. THERE IS EXACTLY ONE ANALYTICS PACKAGE, AND IT IS COOKIELESS.
 *    `@vercel/analytics`, mounted once in the root layout through
 *    `components/analytics.tsx`. No Google Analytics, no Plausible, no Speed
 *    Insights, no advertising network, no tracking pixel — `package.json` has
 *    none of them.
 *
 *    This page previously said there was no analytics product at all, and that
 *    was true until 15 September 2026. The claims that replaced it are narrower
 *    and each one is checkable:
 *
 *    - It sets NO COOKIE and writes nothing to the browser. Visitors are
 *      counted by a hash Vercel derives from the incoming request, discarded
 *      after 24 hours. That is what keeps the "no consent banner" position
 *      defensible, and it is why this product was chosen over the alternatives.
 *    - `/admin` and `/account` page views are NEVER SENT. See the `beforeSend`
 *      redaction in `components/analytics.tsx`. Delete a prefix from that list
 *      and the "Cookies" and "What we collect" sections below become false.
 *    - Query strings are dropped except for an attribution allowlist, so a
 *      token or an address in a page URL is not forwarded even by accident.
 *
 *    If any of that changes, this page is wrong the same day. Change the code,
 *    edit this file in the same commit.
 * 2. YOUTUBE IS EMBEDDED THROUGH `youtube-nocookie.com`. See `lib/embeds.ts` —
 *    that host sets nothing until the visitor presses play, which is what makes
 *    the cookie section honest without a consent banner. Twitch, Bilibili and
 *    Vimeo have no equivalent, so they are named separately.
 * 3. NOTHING PERSONAL REACHES ANTHROPIC. The classifier in `lib/classify.ts`
 *    and the publisher in `lib/autopublish.ts` are sent public news headlines
 *    and public article text. No account, no email address and no prediction
 *    has ever been in one of those prompts, and none should be.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy"
      description="What this site collects, who else touches it, and how to make it stop. Short, because there is not much of it."
    >
      <LegalSection heading="The short version">
        <p>
          You can read every page of Roboxing without an account. We do count
          page views, because otherwise we have no idea whether any of this is
          reaching anyone — but the counter sets no cookie, stores nothing on
          your device, and cannot tell who you are or follow you to another
          site. There is no advertising network here and no tracking pixel.
        </p>
        <p>
          If you never sign in and never subscribe, what exists afterwards is a
          number: one more view of one page, from a country, on a kind of
          device. Nothing that points back to you.
        </p>
        <p>
          An account exists for one reason — to make predictions and keep your
          own record of them. A newsletter subscription exists for one reason —
          to send you the newsletter.
        </p>
      </LegalSection>

      <LegalSection heading="Who is responsible">
        <p>
          Roboxing is operated by {OPERATOR.name}
          {OPERATOR.address ? `, ${OPERATOR.address}` : ""}, in the{" "}
          {OPERATOR.country}. For anything on this page, including a request to
          delete your data, write to{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. A person
          reads that address.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <LegalList>
          <li>
            <strong className="text-ink">Reading the site.</strong> Our host
            records the usual request data — IP address, time, page, browser
            string — as part of serving and protecting the site. We do not build
            profiles from it and we do not join it to anything else.
          </li>
          <li>
            <strong className="text-ink">Page views.</strong> Separately from
            that log, each page view is counted. What is stored with it: the
            time, the page address, the site that linked you here, a rough
            location (country, region, city), your browser and operating system,
            and whether you are on a phone, a tablet or a desktop. Your IP
            address is <em>not</em> stored — it is used once, in passing, to
            work out the country and to produce a scrambled value that
            distinguishes you from the next visitor for 24 hours, after which it
            is discarded. There is no identifier that survives that, so we
            cannot recognise a returning reader and cannot follow you anywhere
            else.
          </li>
          <li>
            <strong className="text-ink">
              What the counter is never told.
            </strong>{" "}
            Pages under <code>/account</code> and <code>/admin</code> are
            excluded outright — the half of the site where a page address would
            say something about a particular person is simply not reported. Web
            addresses are also stripped of everything except the tags that say
            which link brought you (<code>?ref=</code>, <code>?utm_source=</code>{" "}
            and similar), so nothing else in a link is passed on.
          </li>
          <li>
            <strong className="text-ink">If you create an account.</strong> Your
            email address, the display name and profile picture your sign-in
            method provides, and the identifier our authentication provider
            issues. If you sign in with Google, Google tells us your name, email
            address and profile picture — nothing more, and we do not gain
            access to anything else in your Google account.
          </li>
          <li>
            <strong className="text-ink">If you make predictions.</strong> Which
            robot you picked in which bout, and when. Your record is yours;
            picks are shown to other people only as an aggregate percentage
            across everyone, never attributed to you.
          </li>
          <li>
            <strong className="text-ink">If you subscribe.</strong> Your email
            address, which page you subscribed from, and the tokens that make
            the confirmation and unsubscribe links work. Nothing is sent until
            you click the confirmation link — an address that never confirms is
            never mailed, ever.
          </li>
        </LegalList>
        <p>
          That is the complete list. We do not ask for a phone number, a postal
          address, a date of birth or a payment method.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          Signing in sets session cookies. They are what keep you signed in;
          there is no version of an account that works without them, which is
          why there is no banner asking permission for them.
        </p>
        <p>
          We set nothing else. The page-view counter described above is the
          usual reason a site asks for cookie consent, and it is the reason this
          one does not have to: it stores nothing on your device at all — no
          cookie, no local storage — so there is nothing to ask you about. No
          advertising cookie, no cross-site identifier.
        </p>
        <p>
          Embedded video is the exception, and it is not ours. YouTube clips are
          embedded through <code>youtube-nocookie.com</code>, which stores
          nothing until you press play. Twitch, Bilibili and Vimeo players have
          no equivalent and may set their own cookies as soon as the page loads.
          We never re-host video, so when you watch something here you are also
          a visitor of that platform, under its privacy policy.
        </p>
      </LegalSection>

      <LegalSection heading="Who else processes it">
        <p>
          We run almost nothing ourselves. These companies handle data on our
          instructions:
        </p>
        <LegalList>
          <li>
            <strong className="text-ink">Clerk</strong> — accounts and sign-in.
          </li>
          <li>
            <strong className="text-ink">Neon</strong> — the database holding
            accounts, predictions and subscribers.
          </li>
          <li>
            <strong className="text-ink">Vercel</strong> — hosting, the server
            logs described above, and the page-view counter.
          </li>
          <li>
            <strong className="text-ink">Resend</strong> — sending the
            newsletter and the confirmation mail.
          </li>
          <li>
            <strong className="text-ink">Cloudflare</strong> — image and video
            storage for material we publish ourselves.
          </li>
          <li>
            <strong className="text-ink">Google</strong> — only if you choose to
            sign in with Google.
          </li>
        </LegalList>
        <p>
          Two things this site uses that never see your data: the language model
          that scores and drafts news items is sent public headlines and public
          article text only, and the payment processor is not in use — Roboxing
          charges nobody for anything today. If either changes, this page
          changes before it does.
        </p>
        <p>
          These services are based in the United States, so that is where your
          data is stored and processed.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          Account data and predictions stay until you ask us to delete the
          account. A subscriber record stays until you unsubscribe, at which
          point it is marked unsubscribed and stops being mailed; tell us and we
          will remove the row outright. Server logs age out on our host&rsquo;s
          own schedule.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask for a copy of what we hold about you, ask us to correct
          it, ask us to delete it, or object to our keeping it. Every
          newsletter has a one-click unsubscribe link; you do not need to write
          to anyone to use it.
        </p>
        <p>
          For anything else, email{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. There is no
          form and no ticket system — the list of people with accounts here is
          small enough that a reply is faster than either.
        </p>
        <p>
          If you are in the EU, the EEA or the UK, you also have the right to
          complain to your national data protection authority. We would rather
          you told us first, but that right does not depend on us.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          This site is not directed at children, and an account is not intended
          for anyone under 16. If you believe a child has created one, write to
          us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          When this page changes materially, the date at the top changes with
          it. Continuing to use the site after that is how you accept the new
          version — see the{" "}
          <Link href="/terms">terms of use</Link> for the rest.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
