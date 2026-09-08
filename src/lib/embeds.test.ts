import { describe, expect, it } from "vitest";

import { resolveEmbed, toParagraphs, youtubeThumbnailUrl } from "./embeds";

describe("resolveEmbed — refusing to iframe the wrong thing", () => {
  it("returns null for a non-http scheme", () => {
    // The single most important case in this file. `new URL()` parses these
    // happily, and either one in an iframe src executes in our origin.
    expect(resolveEmbed("javascript:alert(1)")).toBeNull();
    expect(resolveEmbed("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(resolveEmbed("vbscript:msgbox(1)")).toBeNull();
    expect(resolveEmbed("file:///etc/passwd")).toBeNull();
  });

  it("returns null for empty and unparseable input", () => {
    expect(resolveEmbed(null)).toBeNull();
    expect(resolveEmbed(undefined)).toBeNull();
    expect(resolveEmbed("")).toBeNull();
    expect(resolveEmbed("   ")).toBeNull();
    expect(resolveEmbed("not a url")).toBeNull();
  });

  it("never iframes an unknown host — it degrades to a link", () => {
    const result = resolveEmbed("https://evil.example.com/watch?v=abc");
    expect(result).toEqual({
      kind: "link",
      href: "https://evil.example.com/watch?v=abc",
      host: "evil.example.com",
    });
  });

  it("is not fooled by an allowlisted host appearing elsewhere in the URL", () => {
    // Subdomain and path tricks: the check is on the parsed hostname, so none
    // of these reach the iframe branch.
    for (const url of [
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      "https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ",
      "https://evil.example/?x=youtu.be/dQw4w9WgXcQ",
    ]) {
      expect(resolveEmbed(url)?.kind).toBe("link");
    }
  });
});

describe("resolveEmbed — YouTube", () => {
  it("embeds a watch URL through the no-cookie host", () => {
    expect(resolveEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "iframe",
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      provider: "YouTube",
      aspect: "16 / 9",
    });
  });

  it("handles youtu.be, /embed/ and /live/", () => {
    for (const url of [
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
    ]) {
      const result = resolveEmbed(url);
      expect(result).toMatchObject({
        kind: "iframe",
        src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      });
    }
  });

  it("marks Shorts as portrait", () => {
    // Most of what this sport produces. A 9:16 clip in a 16:9 box is mostly
    // black rectangle.
    expect(resolveEmbed("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toMatchObject(
      { kind: "iframe", aspect: "9 / 16" },
    );
  });

  it("keeps extra query parameters out of the embed src", () => {
    // A pasted link usually carries ?t=, ?si=, ?list=. Only the id is used, so
    // nothing from the URL is interpolated except a string that matched the id
    // pattern.
    const result = resolveEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=trackingblob",
    );
    expect(result).toMatchObject({
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("falls back to a link when the id is not a real YouTube id", () => {
    // Guards the interpolation: an id that does not match the pattern must
    // never reach the src string.
    const result = resolveEmbed(
      'https://www.youtube.com/watch?v="></iframe><script>alert(1)</script>',
    );
    expect(result?.kind).toBe("link");
  });
});

describe("resolveEmbed — Bilibili and Vimeo", () => {
  it("embeds a Bilibili BV id with autoplay off", () => {
    const result = resolveEmbed("https://www.bilibili.com/video/BV1xx411c7mD");
    expect(result).toMatchObject({
      kind: "iframe",
      provider: "Bilibili",
    });
    expect((result as { src: string }).src).toContain("bvid=BV1xx411c7mD");
    // Three clips on one page must not start three players.
    expect((result as { src: string }).src).toContain("autoplay=0");
  });

  it("falls back to a link for a malformed Bilibili id", () => {
    expect(
      resolveEmbed("https://www.bilibili.com/video/not-a-bv-id")?.kind,
    ).toBe("link");
  });

  it("embeds a numeric Vimeo id", () => {
    expect(resolveEmbed("https://vimeo.com/123456789")).toMatchObject({
      kind: "iframe",
      src: "https://player.vimeo.com/video/123456789",
      provider: "Vimeo",
    });
  });
});

describe("resolveEmbed — X", () => {
  it("is a link card, not an embed", () => {
    // Deliberate: their embed needs a third-party script on every page.
    const result = resolveEmbed("https://x.com/someone/status/1234567890");
    expect(result).toMatchObject({ kind: "link", host: "x.com" });
  });
});

describe("youtubeThumbnailUrl", () => {
  it("builds the poster URL from a watch link", () => {
    expect(
      youtubeThumbnailUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(youtubeThumbnailUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("is null for non-YouTube and unusable input", () => {
    // Bilibili embeds fine but its thumbnails need an API call — no poster.
    expect(
      youtubeThumbnailUrl("https://www.bilibili.com/video/BV1xx411c7mD"),
    ).toBeNull();
    expect(youtubeThumbnailUrl("https://evil.example/watch?v=x")).toBeNull();
    expect(youtubeThumbnailUrl(null)).toBeNull();
    // The injection case: an id that failed the pattern must not reach a URL
    // we then hand to next/image.
    expect(
      youtubeThumbnailUrl('https://www.youtube.com/watch?v="><script>'),
    ).toBeNull();
  });
});

describe("toParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(toParagraphs("One.\n\nTwo.\n\n  Three.  ")).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
  });

  it("treats a single newline as part of the same paragraph", () => {
    expect(toParagraphs("One line\nsame paragraph")).toEqual([
      "One line\nsame paragraph",
    ]);
  });

  it("handles CRLF, which is what a paste from Windows produces", () => {
    expect(toParagraphs("One.\r\n\r\nTwo.")).toEqual(["One.", "Two."]);
  });

  it("is empty for nothing", () => {
    expect(toParagraphs(null)).toEqual([]);
    expect(toParagraphs("   \n\n  ")).toEqual([]);
  });
});
