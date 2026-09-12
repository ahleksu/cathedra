import { describe, expect, it } from "vitest";
import {
  EMPTY_SNAPSHOT,
  SEAT_IDS,
  mutate,
  parseSnapshot,
  type Snapshot,
} from "./model";
const fixture = (): Snapshot => ({
  version: 1,
  revision: 0,
  sections: [
    {
      id: "section-a",
      name: "Demo",
      archived: false,
      students: [
        {
          id: "student-a",
          name: "Example One",
          number: "001",
          archived: false,
        },
        {
          id: "student-b",
          name: "Example Two",
          number: "002",
          archived: false,
        },
      ],
      assignments: { "L1-1": "student-a", "R1-1": "student-b" },
    },
  ],
});
describe("snapshot validation", () => {
  it("defines 42 distinct fixed seats", () =>
    expect(new Set(SEAT_IDS).size).toBe(42));
  it("round trips a valid snapshot", () =>
    expect(parseSnapshot(JSON.stringify(fixture()))).toEqual(fixture()));
  it.each([
    "{",
    "null",
    '{"version":2,"revision":0,"sections":[]}',
    '{"version":1,"revision":-1,"sections":[]}',
  ])("rejects malformed or unsupported input", (raw) =>
    expect(() => parseSnapshot(raw)).toThrow(),
  );
  it("rejects duplicate IDs and cross-section assignments", () => {
    const value = fixture();
    value.sections.push({
      ...value.sections[0],
      id: "section-b",
      students: [],
    });
    expect(() => parseSnapshot(JSON.stringify(value))).toThrow();
    value.sections[1].assignments = {};
    value.sections[1].students = [{ ...value.sections[0].students[0] }];
    expect(() => parseSnapshot(JSON.stringify(value))).toThrow();
  });
  it("rejects illegal seats and duplicate seating", () => {
    const value = fixture();
    value.sections[0].assignments["L1-2"] = "student-a";
    expect(() => parseSnapshot(JSON.stringify(value))).toThrow();
    value.sections[0].assignments = { Z1: "student-a" };
    expect(() => parseSnapshot(JSON.stringify(value))).toThrow();
  });
});
describe("roster operations", () => {
  it("swaps already seated students without mutating the previous state", () => {
    const value = fixture();
    const next = mutate(value, {
      type: "assign",
      sectionId: "section-a",
      studentId: "student-a",
      seatId: "R1-1",
    });
    expect(next.sections[0].assignments).toEqual({
      "L1-1": "student-b",
      "R1-1": "student-a",
    });
    expect(value).toEqual(fixture());
  });
  it("allows overflow and duplicate labels while preserving leading zeroes", () => {
    let value = mutate(EMPTY_SNAPSHOT, {
      type: "createSection",
      name: " Demo ",
    });
    const sectionId = value.sections[0].id;
    for (let i = 0; i < 43; i++)
      value = mutate(value, {
        type: "addStudent",
        sectionId,
        name: " Example ",
        number: "001",
      });
    expect(value.sections[0].students).toHaveLength(43);
    expect(value.sections[0].students[0]).toMatchObject({
      name: "Example",
      number: "001",
    });
    expect(() =>
      mutate(value, {
        type: "addStudent",
        sectionId,
        name: " ",
        number: "001",
      }),
    ).toThrow();
  });
  it("archives students without restoring their seats, and preserves archived section maps", () => {
    let value = mutate(fixture(), {
      type: "archiveSection",
      sectionId: "section-a",
    });
    expect(value.sections[0].assignments).toEqual(
      fixture().sections[0].assignments,
    );
    value = mutate(value, { type: "restoreSection", sectionId: "section-a" });
    value = mutate(value, {
      type: "archiveStudent",
      sectionId: "section-a",
      studentId: "student-a",
    });
    value = mutate(value, {
      type: "restoreStudent",
      sectionId: "section-a",
      studentId: "student-a",
    });
    expect(Object.values(value.sections[0].assignments)).not.toContain(
      "student-a",
    );
    expect(parseSnapshot(JSON.stringify(value))).toEqual(value);
  });
  it("requires archiving before permanent deletion", () => {
    expect(() =>
      mutate(fixture(), { type: "deleteSection", sectionId: "section-a" }),
    ).toThrow();
    expect(() =>
      mutate(fixture(), {
        type: "deleteStudent",
        sectionId: "section-a",
        studentId: "student-a",
      }),
    ).toThrow();
  });
});

describe("editing and assignment boundaries", () => {
  it("edits labels without changing identities and deletes archived records", () => {
    let value = mutate(fixture(), {
      type: "renameSection",
      sectionId: "section-a",
      name: " Renamed ",
    });
    value = mutate(value, {
      type: "editStudent",
      sectionId: "section-a",
      studentId: "student-a",
      name: " Updated ",
      number: "00007",
    });
    expect(value.sections[0]).toMatchObject({
      name: "Renamed",
      students: [
        { id: "student-a", name: "Updated", number: "00007" },
        { id: "student-b" },
      ],
    });
    value = mutate(value, {
      type: "archiveStudent",
      sectionId: "section-a",
      studentId: "student-a",
    });
    value = mutate(value, {
      type: "deleteStudent",
      sectionId: "section-a",
      studentId: "student-a",
    });
    expect(value.sections[0].students.map((student) => student.id)).toEqual([
      "student-b",
    ]);
    value = mutate(value, { type: "archiveSection", sectionId: "section-a" });
    expect(
      mutate(value, { type: "deleteSection", sectionId: "section-a" }).sections,
    ).toEqual([]);
  });
  it("displaces an occupant when an unseated student takes the seat", () => {
    let value = mutate(fixture(), {
      type: "unassign",
      sectionId: "section-a",
      seatId: "L1-1",
    });
    value = mutate(value, {
      type: "assign",
      sectionId: "section-a",
      studentId: "student-a",
      seatId: "R1-1",
    });
    expect(value.sections[0].assignments).toEqual({ "R1-1": "student-a" });
  });
  it("refuses archived edits and assignments from another section", () => {
    const value = mutate(fixture(), {
      type: "archiveSection",
      sectionId: "section-a",
    });
    expect(() =>
      mutate(value, {
        type: "addStudent",
        sectionId: "section-a",
        name: "Example",
        number: "003",
      }),
    ).toThrow();
    expect(() =>
      mutate(fixture(), {
        type: "assign",
        sectionId: "section-a",
        studentId: "other-section-student",
        seatId: "L1-1",
      }),
    ).toThrow();
  });
  it("rejects archived occupants and unknown schema fields", () => {
    const value = fixture();
    value.sections[0].students[0].archived = true;
    expect(() => parseSnapshot(JSON.stringify(value))).toThrow();
    expect(() =>
      parseSnapshot(JSON.stringify({ ...fixture(), unexpected: "field" })),
    ).toThrow();
  });
});
