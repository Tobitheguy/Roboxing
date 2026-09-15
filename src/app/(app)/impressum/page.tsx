import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Legal notice",
  description:
    "Who operates Roboxing, and how to reach them. Provider identification for a site published from the United States.",
};

/**
 * Impressum / legal notice.
 *
 * WHY THIS PAGE IS HERE AND WHAT IT IS NOT
 * ----------------------------------------
 * §5 DDG (the successor to §5 TMG) requires a German-style Impressum of
 * providers established in Germany. Roboxing is operated from the United
 * States, so on the present facts that duty does not attach and this page is
 * voluntary — which is precisely why it must not PRESENT itself as a §5
 * Impressum while omitting the postal address that §5 makes mandatory. A page
 * claiming to be a compliant Impressum and missing a required element is worse
 * than a page that plainly identifies the provider, which is what this is.
 *
 * It exists anyway for two practical reasons. German and Austrian readers look
 * for it and read its absence as a site with something to hide, and Roboxing's
 * whole claim is to be a trustworthy record. And Google's OAuth consent screen
 * wants a homepage, a privacy policy and terms before it will let an app
 * publish — this page is the one a reader lands on from the other two.
 *
 * IF THE OPERATOR EVER BECOMES ESTABLISHED IN GERMANY, this page is no longer
 * optional and no longer sufficient: set `OPERATOR.address` in `lib/legal.ts`
 * (it renders automatically everywhere) and have the wording checked, because
 * at that point the missing address is a chargeable defect rather than a
 * deliberate omission.
 */
export default function ImpressumPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Legal notice"
      description="Impressum — who publishes this site and how to reach a human here."
    >
      <LegalSection heading="Provider">
        <p>
          Roboxing is published by {OPERATOR.name}, operating as a sole
          individual from the {OPERATOR.country}.
        </p>
        {OPERATOR.address ? <p>{OPERATOR.address}</p> : null}
        <p>
          Email: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
        </p>
        <p>
          Responsible for editorial content: {OPERATOR.name}, at the address
          above.
        </p>
      </LegalSection>

      <LegalSection heading="What this site publishes">
        <p>
          Roboxing is an independent editorial record of humanoid robot
          fighting. It is not affiliated with any league, organiser,
          manufacturer or broadcaster, and it holds no broadcast rights to the
          events it covers.
        </p>
        <p>
          League names, robot names and organiser logos belong to their
          respective owners and are used to identify what is being reported on.
        </p>
      </LegalSection>

      <LegalSection heading="Links to other sites">
        <p>
          This site links to and embeds material published elsewhere, including
          video on YouTube, Twitch, Bilibili and Vimeo. We have no control over
          what those sites publish and take no responsibility for their
          contents; responsibility for them rests with their own operators.
        </p>
      </LegalSection>

      <LegalSection heading="Corrections and complaints">
        <p>
          If something published here is wrong, write to{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> and it will
          be corrected. If you believe something here infringes your rights,
          write to the same address and say what and why — it is faster than any
          other route and it will be acted on.
        </p>
      </LegalSection>

      <LegalSection heading="Also worth reading">
        <p>
          <Link href="/privacy">Privacy</Link> — what is collected and who
          processes it. <Link href="/terms">Terms of use</Link> — what this site
          claims and what it does not promise.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
