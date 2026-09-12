import { describe, expect, it } from "vitest";
import { ROOM_SEATS } from "./room-layout";
import { getCameraPose, canSelectSeat } from "./camera-controls";

describe("room geometry", () => {
  it("provides 42 uniquely identified desks in six rows, three left and four right", () => {
    expect(ROOM_SEATS).toHaveLength(42);
    expect(new Set(ROOM_SEATS.map((seat) => seat.id)).size).toBe(42);
    for (let row = 1; row <= 6; row++) {
      expect(
        ROOM_SEATS.filter((seat) => seat.id.startsWith(`L${row}-`)),
      ).toHaveLength(3);
      expect(
        ROOM_SEATS.filter((seat) => seat.id.startsWith(`R${row}-`)),
      ).toHaveLength(4);
    }
  });
  it("puts row one nearest the instructor and column one beside the aisle", () => {
    const position = (id: string) =>
      ROOM_SEATS.find((seat) => seat.id === id)!.position;
    expect(position("L1-1")[2]).toBeLessThan(position("L6-1")[2]);
    expect(position("L1-1")[0]).toBeGreaterThan(0);
    expect(position("R1-1")[0]).toBeLessThan(0);
    expect(Math.abs(position("L1-1")[0])).toBeLessThan(
      Math.abs(position("L1-3")[0]),
    );
    expect(Math.abs(position("R1-1")[0])).toBeLessThan(
      Math.abs(position("R1-4")[0]),
    );
  });
});

describe("camera interactions", () => {
  it("focuses explicitly on a known seat and safely resets for an unknown seat", () => {
    const seat = ROOM_SEATS[0];
    expect(getCameraPose({ preset: "focus", seatId: seat.id }).target).toEqual([
      seat.position[0],
      0.8,
      seat.position[2],
    ]);
    expect(getCameraPose({ preset: "focus", seatId: "invalid" })).toEqual(
      getCameraPose({ preset: "reset" }),
    );
  });
  it("offers distinct instructor and top views", () => {
    const instructor = getCameraPose({ preset: "instructor" });
    const top = getCameraPose({ preset: "top" });
    expect(instructor.position[2]).toBeLessThan(instructor.target[2]);
    expect(top.position[1]).toBeGreaterThan(instructor.position[1]);
    expect(top.position[0]).toBe(top.target[0]);
  });
  it("does not interpret a navigation gesture or a drag as seat selection", () => {
    expect(canSelectSeat(false, 0)).toBe(true);
    expect(canSelectSeat(true, 0)).toBe(false);
    expect(canSelectSeat(false, 12)).toBe(false);
  });
});
