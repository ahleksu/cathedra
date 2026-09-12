import { z } from "zod";

export type SeatId = string;
export interface Student {
  id: string;
  name: string;
  number: string;
  archived: boolean;
}
export interface Section {
  id: string;
  name: string;
  archived: boolean;
  students: Student[];
  assignments: Record<string, string>;
}
export interface Snapshot {
  version: 1;
  revision: number;
  sections: Section[];
}
export const EMPTY_SNAPSHOT: Snapshot = {
  version: 1,
  revision: 0,
  sections: [],
};
export const EMPTY = EMPTY_SNAPSHOT;
export const SEAT_IDS: SeatId[] = ["L", "R"].flatMap((side) =>
  Array.from({ length: 6 }, (_, row) =>
    Array.from(
      { length: side === "L" ? 3 : 4 },
      (_, column) => `${side}${row + 1}-${column + 1}`,
    ),
  ).flat(),
);
const seats = new Set(SEAT_IDS);
const text = z.string().trim().min(1).max(1000);
const id = z
  .string()
  .min(1)
  .max(200)
  .refine(
    (value) => !["__proto__", "constructor", "prototype"].includes(value),
  );
const studentSchema = z
  .object({ id, name: text, number: text, archived: z.boolean() })
  .strict();
const sectionSchema = z
  .object({
    id,
    name: text,
    archived: z.boolean(),
    students: z.array(studentSchema),
    assignments: z.record(z.string(), id),
  })
  .strict();
const snapshotSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    sections: z.array(sectionSchema),
  })
  .strict();

export function parseSnapshot(raw: string): Snapshot {
  let value: Snapshot;
  try {
    value = snapshotSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      "This file is not a supported Cathedra backup. Use a valid version 1 JSON backup.",
    );
  }
  const ids = new Set<string>();
  for (const section of value.sections) {
    for (const entity of [section, ...section.students]) {
      if (ids.has(entity.id))
        throw new Error("This backup contains duplicate record IDs.");
      ids.add(entity.id);
    }
    const assigned = new Set<string>();
    for (const [seat, studentId] of Object.entries(section.assignments)) {
      if (
        !seats.has(seat) ||
        assigned.has(studentId) ||
        !section.students.some(
          (student) => student.id === studentId && !student.archived,
        )
      ) {
        throw new Error("This backup contains an invalid seat assignment.");
      }
      assigned.add(studentId);
    }
  }
  return value;
}

export type Action =
  | { type: "createSection"; name: string }
  | { type: "renameSection"; sectionId: string; name: string }
  | { type: "archiveSection"; sectionId: string }
  | { type: "restoreSection"; sectionId: string }
  | { type: "deleteSection"; sectionId: string }
  | { type: "addStudent"; sectionId: string; name: string; number: string }
  | {
      type: "editStudent";
      sectionId: string;
      studentId: string;
      name: string;
      number: string;
    }
  | { type: "archiveStudent"; sectionId: string; studentId: string }
  | { type: "restoreStudent"; sectionId: string; studentId: string }
  | { type: "deleteStudent"; sectionId: string; studentId: string }
  | { type: "assign"; sectionId: string; studentId: string; seatId: SeatId }
  | { type: "unassign"; sectionId: string; seatId: SeatId };

function required(value: string): string {
  const result = text.safeParse(value);
  if (!result.success)
    throw new Error("Enter text between 1 and 1,000 characters.");
  return result.data;
}

export function mutate(snapshot: Snapshot, action: Action): Snapshot {
  const next = parseSnapshot(JSON.stringify(snapshot));
  if (action.type === "createSection") {
    next.sections.push({
      id: crypto.randomUUID(),
      name: required(action.name),
      archived: false,
      students: [],
      assignments: {},
    });
    return next;
  }
  const section = next.sections.find((item) => item.id === action.sectionId);
  if (!section)
    throw new Error("The section no longer exists. Reload your saved data.");
  if (action.type === "archiveSection") {
    section.archived = true;
    return next;
  }
  if (action.type === "restoreSection") {
    section.archived = false;
    return next;
  }
  if (action.type === "deleteSection") {
    if (!section.archived)
      throw new Error("Archive the section before deleting it permanently.");
    next.sections = next.sections.filter((item) => item.id !== section.id);
    return next;
  }
  if (section.archived)
    throw new Error("Restore this section before editing it.");
  if (action.type === "renameSection") {
    section.name = required(action.name);
    return next;
  }
  if (action.type === "addStudent") {
    section.students.push({
      id: crypto.randomUUID(),
      name: required(action.name),
      number: required(action.number),
      archived: false,
    });
    return next;
  }
  if (action.type === "unassign") {
    if (!seats.has(action.seatId))
      throw new Error("Choose a valid classroom seat.");
    delete section.assignments[action.seatId];
    return next;
  }
  const student = section.students.find((item) => item.id === action.studentId);
  if (!student)
    throw new Error("The student no longer exists in this section.");
  if (action.type === "restoreStudent") {
    student.archived = false;
    return next;
  }
  if (action.type === "archiveStudent" || action.type === "deleteStudent") {
    if (action.type === "deleteStudent" && !student.archived)
      throw new Error("Archive the student before deleting them permanently.");
    for (const [seat, studentId] of Object.entries(section.assignments))
      if (studentId === student.id) delete section.assignments[seat];
    if (action.type === "archiveStudent") student.archived = true;
    else
      section.students = section.students.filter(
        (item) => item.id !== student.id,
      );
    return next;
  }
  if (student.archived)
    throw new Error("Restore this student before editing or seating them.");
  if (action.type === "editStudent") {
    student.name = required(action.name);
    student.number = required(action.number);
    return next;
  }
  if (!seats.has(action.seatId))
    throw new Error("Choose a valid classroom seat.");
  const previousSeat = Object.keys(section.assignments).find(
    (seat) => section.assignments[seat] === student.id,
  );
  const displaced = section.assignments[action.seatId];
  if (previousSeat) {
    delete section.assignments[previousSeat];
    if (displaced && displaced !== student.id)
      section.assignments[previousSeat] = displaced;
  }
  section.assignments[action.seatId] = student.id;
  return next;
}
