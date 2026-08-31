import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./safe-redirect";

/**
 * The attack this prevents: someone sends a real Roboxing sign-in link with a
 * crafted `redirect_url`. The victim checks the domain, sees roboxing.tv,
 * signs in for real — and lands on a copy of the site asking for their card.
 * Everything up to the last step was genuine, which is what makes it work.
 */

/**
 * Control characters are built from char codes, never typed as literals. An
 * invisible byte in a test is a test nobody can review, and the first draft of
 * the implementation shipped exactly that mistake.
 */
const ch = (code: number) => String.fromCharCode(code);

describe("ordinary destinations pass through", () => {
  it.each([
    "/",
    "/schedule",
    "/watch/exhibition-night-1",
    "/teams/titan-labs",
    "/competitions/exhibition-season-1?tab=standings",
    "/results#latest",
  ])("keeps %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });
});

describe("anything that could name another host is refused", () => {
  it.each([
    ["a full URL", "https://evil.example/steal"],
    ["a scheme-relative URL", "//evil.example/steal"],
    ["backslashes, which browsers normalise to slashes", "/\\evil.example"],
    ["a mixed pair", "/\\/evil.example"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["a bare host", "evil.example"],
    ["a relative path that escapes", "../../evil"],
  ])("refuses %s", (_label, path) => {
    expect(safeRedirectPath(path)).toBe("/");
  });
});

describe("control characters", () => {
  // A browser may strip these before parsing the URL. The value that passed
  // the check and the value the browser acts on are then different strings.
  it("refuses a newline, which also splits the Location header", () => {
    expect(safeRedirectPath(`/ok${ch(10)}Location: https://evil.example`)).toBe(
      "/",
    );
  });

  it("refuses a carriage return", () => {
    expect(safeRedirectPath(`/ok${ch(13)}Set-Cookie: a=b`)).toBe("/");
  });

  it("refuses a tab inside what looks like a scheme-relative URL", () => {
    expect(safeRedirectPath(`/${ch(9)}/evil.example`)).toBe("/");
  });

  it("refuses a null byte", () => {
    expect(safeRedirectPath(`/watch${ch(0)}/x`)).toBe("/");
  });

  it("refuses DEL", () => {
    expect(safeRedirectPath(`/watch${ch(127)}`)).toBe("/");
  });

  it("still allows the non-ASCII characters a real slug can contain", () => {
    expect(safeRedirectPath("/teams/muenchen-robotik")).toBe(
      "/teams/muenchen-robotik",
    );
  });
});

describe("no loops back into the flow just completed", () => {
  it.each([
    "/sign-in",
    "/sign-in/factor-two",
    "/sign-in?redirect_url=%2Fsign-in",
    "/sign-up",
    "/sign-up/verify",
    "/welcome",
    "/welcome/secure",
  ])("refuses %s", (path) => {
    expect(safeRedirectPath(path)).toBe("/");
  });

  it("does not refuse a real route that merely starts with the same letters", () => {
    expect(safeRedirectPath("/sign-in-guide")).toBe("/sign-in-guide");
    expect(safeRedirectPath("/welcomes")).toBe("/welcomes");
  });
});

describe("empty and malformed input", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["only whitespace", "   "],
  ])("falls back for %s", (_label, value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });

  it("honours a caller-supplied fallback", () => {
    expect(safeRedirectPath(null, "/schedule")).toBe("/schedule");
    expect(safeRedirectPath("https://evil.example", "/schedule")).toBe(
      "/schedule",
    );
  });
});
