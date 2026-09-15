import type { Metadata } from "next";
import Link from "next/link";

import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Roboxing collects, who processes it, and how to get it deleted. No analytics, no advertising cookies, no tracking pixels.",
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
 * 1. THERE IS NO ANALYTICS PACKAGE. Not Vercel Analytics, not Speed Insights,
 *    not Google Analytics, not Plausible — `package.json` has none of them and
 *    no layout renders a script tag. The "we do not track you" paragraph is
 *    load-bearing: add an analytics product and this page is wrong the same
 *    day. Add the product, edit this file in the same commit.
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
          You can read every page of Roboxing without an account, and we do not
          measure you while you do it. There is no analytics product on this
          site, no advertising network, and no tracking pixel. If you never sign
          in and never subscribe, the only record of your visit is the ordinary
          server log our host keeps.
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
          We set nothing else. No analytics cookie, no advertising cookie, no
          cross-site identifier.
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
            <strong className="text-ink">Vercel</strong> — hosting, and the
            server logs described above.
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
