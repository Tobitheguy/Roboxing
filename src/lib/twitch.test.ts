import { describe, expect, it } from "vitest";

import { twitchEmbedUrl } from "@/components/live-stream-player";
import { twitchLogin } from "./twitch";

/**
 * The two pure pieces of the live embed.
 *
 * Both fail SILENTLY when wrong, which is why they are pinned: a bad login
 * polls a channel that does not exist and reports nobody live, and a missing
 * `parent` makes Twitch render a grey box that looks like a styling bug.
 */
describe("twitchLogin", () => {
  it("takes the login out of a channel URL", () => {
    expect(twitchLogin("https://www.twitch.tv/ufb0ts")).toBe("ufb0ts");
    expect(twitchLogin("https://twitch.tv/UFB0ts")).toBe("ufb0ts");
  });

  it("refuses anything deeper than a channel", () => {
    // A VOD or a clip is not a channel and must not be polled as one.
    expect(twitchLogin("https://www.twitch.tv/ufb0ts/clip/abc")).toBeNull();
    expect(twitchLogin("https://www.twitch.tv/videos/12345")).toBeNull();
  });

  it("refuses other hosts and junk", () => {
    expect(twitchLogin("https://www.youtube.com/@engineai")).toBeNull();
    expect(twitchLogin("https://twitch.tv.evil.test/ufb0ts")).toBeNull();
    expect(twitchLogin("not a url")).toBeNull();
    expect(twitchLogin(null)).toBeNull();
  });
});

describe("twitchEmbedUrl", () => {
  it("lists every host the site is served from", () => {
    const url = twitchEmbedUrl("ufb0ts");
    // Twitch checks the EMBEDDING host against these. Miss one and the player
    // is a grey box on that domain only — which is how an embed ships
    // "working" from localhost and broken in production.
    for (const host of ["roboxing.tv", "www.roboxing.tv", "localhost"]) {
      expect(url).toContain(`parent=${host}`);
    }
  });

  it("starts muted", () => {
    // An autoplaying stream with sound is how a visitor closes the tab — and
    // browsers block unmuted autoplay anyway, which would leave a dead frame.
    expect(twitchEmbedUrl("ufb0ts")).toContain("muted=true");
  });

  it("encodes the channel", () => {
    expect(twitchEmbedUrl("a b")).toContain("channel=a%20b");
  });
});
