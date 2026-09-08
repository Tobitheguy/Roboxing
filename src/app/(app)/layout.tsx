import { AppChrome } from "@/components/app-chrome";

/**
 * The frame around the site.
 *
 * There is no gate here any more, and its removal was the point of the change:
 * this layout used to call `requireVerifiedViewer()`, which made every page
 * below it — the schedule, the results, every event — answer a stranger with a
 * sign-in form. For a subscription product with rights to sell that was
 * defensible. For a publication whose readers arrive from a clip on someone
 * else's platform it is fatal, and it also kept the entire site out of every
 * search index.
 *
 * What replaced it is not "no gate", it is gates that sit where the private
 * thing actually is:
 *
 *   - `account/layout.tsx` and `admin/layout.tsx` guard their own subtrees, so
 *     a page added to either is protected by where it lives — which is the
 *     property this layout used to provide, kept intact for the parts that
 *     need it.
 *   - Video is entitled per event in `resolvePlayback()`, at the moment a
 *     playback URL is minted. That was always the real paywall; this layout
 *     was only ever hiding the page around it.
 *
 * Anything added directly under `(app)` is therefore PUBLIC. That is correct
 * for a publication and wrong for anything else, so anything else belongs in
 * one of the two guarded subtrees rather than here.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppChrome>{children}</AppChrome>;
}
