import type { Metadata } from "next";
import Link from "next/link";

import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";
import { GOVERNING_LAW, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for using Roboxing: what the record claims, how predictions work, and what we do not promise.",
};

/**
 * Terms of use.
 *
 * The temptation with this page is to copy a SaaS template and inherit clauses
 * about subscription tiers, user-generated content and acceptable use of an API
 * — none of which exist here. Everything below describes something this site
 * actually does.
 *
 * The two clauses that are not boilerplate, and exist because of specific
 * decisions recorded elsewhere in this repository:
 *
 * - PREDICTIONS ARE NOT A WAGER, and the wording says so in the operative
 *   sense, not as reassurance: no stake, no prize, no consideration. Real-money
 *   betting was considered and rejected on US exposure grounds. If a prize ever
 *   attaches to the prediction game, this clause is the first thing that has to
 *   be rewritten, and a lawyer should do it.
 * - THE ACCURACY CLAUSE ADMITS THE MACHINE. Some briefs are drafted by a model
 *   from a fetched source article and are labelled on the page itself. Claiming
 *   uniform human authorship here while the article pages disclose otherwise
 *   would put the contradiction inside our own site.
 */
export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of use"
      description="What you can expect from this site, what it expects from you, and the things it deliberately does not promise."
    >
      <LegalSection heading="What Roboxing is">
        <p>
          Roboxing is an independent record of humanoid robot fighting:
          schedule, results, teams, machines and editorial. It is free to read
          and requires no account.
        </p>
        <p>
          It is not a league, not an organiser, and not a broadcaster. We hold
          no rights to the events we cover. Where an event is streamed, we link
          to or embed whoever is streaming it.
        </p>
      </LegalSection>

      <LegalSection heading="Accuracy, and its limits">
        <p>
          This site takes its record seriously. A result is entered only when
          two independent sources name the winner, the score and the method;
          facts carry a confidence marker and, where we have one, a link to the
          source; and what is unknown is published as unknown on the{" "}
          <Link href="/open-questions">open questions</Link> page rather than
          quietly omitted.
        </p>
        <p>
          It is still a record assembled from other people&rsquo;s reporting,
          often in translation, about a sport whose organisers frequently do not
          publish full cards. Some short news briefs are drafted by a language
          model from the source article and are labelled as such where they
          appear. We make no warranty that any of it is correct or complete, and
          nothing here should be relied on for a decision that matters.
        </p>
        <p>
          If something on this site is wrong, tell us at{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> and we will
          correct it. Corrections are published, not silently applied.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts">
        <p>
          An account is optional and exists to make predictions and keep your
          own record of them. Use an email address you control, keep your
          sign-in to yourself, and do not create accounts for other people.
        </p>
        <p>
          You can ask us to delete your account at any time — see the{" "}
          <Link href="/privacy">privacy page</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="Predictions are a game, not a bet">
        <p>
          Picking a winner on this site costs nothing, stakes nothing and pays
          nothing. There is no entry fee, no prize, no cash-out, and no
          purchase that improves your odds. It is a free-to-play game and it is
          not gambling.
        </p>
        <LegalList>
          <li>
            One pick per person per bout, changeable until the event&rsquo;s
            start time. Picks close for the whole card at once, not per bout.
          </li>
          <li>
            A draw or a no contest voids the pick rather than losing it.
          </li>
          <li>
            Records are calculated from results, never stored. If a result is
            corrected, every record that depends on it moves with it.
          </li>
          <li>
            We may void picks or correct records where a result changes, an
            event is abandoned, or the game is manipulated.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="Video and other people's platforms">
        <p>
          We never re-host video. A stream or clip shown on this site is played
          from YouTube, Twitch, Bilibili or Vimeo inside their own player, and
          watching it makes you their visitor under their terms. Whether it is
          available, geoblocked or taken down is not ours to control.
        </p>
      </LegalSection>

      <LegalSection heading="What you may do with what is here">
        <p>
          Read it, quote it, and link to it. If you use a fact from this site in
          your own work, a link back is the courtesy we ask for and an
          attribution is the one we expect for anything longer than a sentence.
        </p>
        <p>
          Please do not copy the site wholesale, republish its pages as your
          own, or scrape it at a rate that costs us money. Facts are not owned
          by anyone; the writing, the design and the code here are ours.
        </p>
        <p>
          League names, robot names and organiser logos belong to their owners
          and are used here to identify what is being reported on. If you own
          one and would rather we did not, write to us — removing a logo takes
          one commit.
        </p>
      </LegalSection>

      <LegalSection heading="Availability">
        <p>
          This is a small independent site. It may be slow, briefly down, or
          missing something it should have. We promise no uptime, and we may
          change or remove any part of it.
        </p>
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          Roboxing charges nobody for anything. Nothing on this site is behind a
          paywall and no payment method is collected. If that ever changes, it
          will be announced and covered by its own terms — it will not arrive
          quietly inside this page.
        </p>
      </LegalSection>

      <LegalSection heading="Liability">
        <p>
          The site is provided as it is. To the extent the law allows, we are
          not liable for loss arising from using it or from relying on anything
          published here. Nothing in these terms limits liability that cannot be
          limited — including for death, personal injury, or fraud.
        </p>
      </LegalSection>

      <LegalSection heading="Ending it">
        <p>
          You can stop using the site and delete your account whenever you like.
          We may suspend an account that is used to abuse the site, other
          readers, or the prediction game.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the law of {GOVERNING_LAW}. If you are a
          consumer in the EU, the EEA or the UK, this does not take away the
          protection of the mandatory law of the country you live in.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          {OPERATOR.name}
          {OPERATOR.address ? `, ${OPERATOR.address}` : ""} —{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. See also
          the <Link href="/impressum">legal notice</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
