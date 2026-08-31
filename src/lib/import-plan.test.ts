import { describe, expect, it } from "vitest";

import { readCsv } from "./csv";
import {
  planFixtureImport,
  planRobotImport,
  planTeamImport,
} from "./import-plan";

/**
 * The preview a person approves is produced by exactly this code, and so is
 * the work that follows. These tests exist because the failure mode of an
 * import is not a crash — it is quietly overwriting the wrong rows, or
 * inventing a team from a typo in a spreadsheet.
 */

const TEAMS = [
  { id: 1, slug: "alpha" },
  { id: 2, slug: "bravo" },
];

describe("planTeamImport", () => {
  it("creates unknown slugs and updates known ones", () => {
    const plan = planTeamImport(
      readCsv("slug,name\nalpha,Alpha Renamed\ncharlie,Charlie Systems"),
      TEAMS,
    );
    expect(plan.updates).toBe(1);
    expect(plan.creates).toBe(1);
    expect(plan.rows[0]).toMatchObject({ action: "update", existingId: 1 });
    expect(plan.rows[1]).toMatchObject({ action: "create", existingId: undefined });
  });

  it("reports the spreadsheet line number, header included", () => {
    // So "line 3" in the preview is line 3 in the file the person is looking at.
    const plan = planTeamImport(readCsv("slug,name\nalpha,A\n,B"), TEAMS);
    expect(plan.rows[1].line).toBe(3);
  });

  it("rejects a duplicate slug within one file", () => {
    // Both rows would apply and the last would silently win.
    const plan = planTeamImport(
      readCsv("slug,name\ndelta,First\ndelta,Second"),
      TEAMS,
    );
    expect(plan.rows[1].action).toBe("error");
    expect(plan.rows[1].errors?.[0]).toMatch(/duplicate/i);
  });

  it("rejects a malformed slug rather than silently fixing it", () => {
    const plan = planTeamImport(readCsv("slug,name\nNot A Slug,X"), TEAMS);
    expect(plan.rows[0].action).toBe("error");
  });

  it("accepts the header spellings a third-party export produces", () => {
    const plan = planTeamImport(
      readCsv("Slug,Name,Founded Year\ncharlie,Charlie,2024"),
      TEAMS,
    );
    expect(plan.rows[0].action).toBe("create");
    expect(plan.rows[0].values?.foundedyear).toBe(2024);
  });
});

describe("planRobotImport", () => {
  const ROBOTS = [{ id: 10, slug: "alpha-1" }];

  it("resolves the team by slug", () => {
    const plan = planRobotImport(
      readCsv("slug,name,teamSlug\nbravo-1,BRAVO-1,bravo"),
      ROBOTS,
      TEAMS,
    );
    expect(plan.rows[0]).toMatchObject({ action: "create" });
    expect(plan.rows[0].values?.teamId).toBe(2);
  });

  it("refuses to invent a team from an unknown slug", () => {
    // Creating one implicitly would turn a typo into an organisation.
    const plan = planRobotImport(
      readCsv("slug,name,teamSlug\nzulu-1,ZULU-1,zulu"),
      ROBOTS,
      TEAMS,
    );
    expect(plan.rows[0].action).toBe("error");
    expect(plan.rows[0].errors?.[0]).toMatch(/no team with slug/i);
  });

  it("updates a robot that already exists", () => {
    const plan = planRobotImport(
      readCsv("slug,name,teamSlug\nalpha-1,Renamed,alpha"),
      ROBOTS,
      TEAMS,
    );
    expect(plan.rows[0]).toMatchObject({ action: "update", existingId: 10 });
  });
});

describe("planFixtureImport", () => {
  const EVENTS = [{ id: 100, slug: "night-1", competitionId: 5 }];
  const ROBOTS = [
    { id: 10, slug: "alpha-1", teamId: 1 },
    { id: 20, slug: "bravo-1", teamId: 2 },
  ];

  it("captures each robot's team at import time", () => {
    // Stored on the bout so a later transfer cannot rewrite a finished result.
    const plan = planFixtureImport(
      readCsv(
        "eventSlug,orderIndex,robotASlug,robotBSlug\nnight-1,1,alpha-1,bravo-1",
      ),
      EVENTS,
      ROBOTS,
      [],
    );
    expect(plan.rows[0].values).toMatchObject({
      eventId: 100,
      competitionId: 5,
      robotAId: 10,
      robotBId: 20,
      teamAId: 1,
      teamBId: 2,
      scheduledRounds: 3,
    });
  });

  it("updates the bout already in that slot", () => {
    const plan = planFixtureImport(
      readCsv(
        "eventSlug,orderIndex,robotASlug,robotBSlug\nnight-1,1,alpha-1,bravo-1",
      ),
      EVENTS,
      ROBOTS,
      [{ id: 999, eventId: 100, orderIndex: 1 }],
    );
    expect(plan.rows[0]).toMatchObject({ action: "update", existingId: 999 });
  });

  it("rejects two rows claiming the same position on one card", () => {
    // Would violate the UNIQUE constraint mid-import and leave it half applied.
    const plan = planFixtureImport(
      readCsv(
        "eventSlug,orderIndex,robotASlug,robotBSlug\nnight-1,1,alpha-1,bravo-1\nnight-1,1,bravo-1,alpha-1",
      ),
      EVENTS,
      ROBOTS,
      [],
    );
    expect(plan.rows[1].action).toBe("error");
    expect(plan.rows[1].errors?.[0]).toMatch(/same card/i);
  });

  it("rejects a robot fighting itself", () => {
    const plan = planFixtureImport(
      readCsv(
        "eventSlug,orderIndex,robotASlug,robotBSlug\nnight-1,1,alpha-1,alpha-1",
      ),
      EVENTS,
      ROBOTS,
      [],
    );
    expect(plan.rows[0].action).toBe("error");
  });

  it("collects every problem on a row, not just the first", () => {
    // So one pass through the file fixes everything rather than one error at a time.
    const plan = planFixtureImport(
      readCsv("eventSlug,orderIndex,robotASlug,robotBSlug\nnope,1,ghost,phantom"),
      EVENTS,
      ROBOTS,
      [],
    );
    expect(plan.rows[0].errors).toHaveLength(3);
  });

  it("counts creates, updates and errors", () => {
    const plan = planFixtureImport(
      readCsv(
        "eventSlug,orderIndex,robotASlug,robotBSlug\n" +
          "night-1,1,alpha-1,bravo-1\n" +
          "night-1,2,bravo-1,alpha-1\n" +
          "missing,3,alpha-1,bravo-1",
      ),
      EVENTS,
      ROBOTS,
      [{ id: 999, eventId: 100, orderIndex: 1 }],
    );
    expect(plan).toMatchObject({ creates: 1, updates: 1, errors: 1 });
  });
});
