export type RoomSeat = { id: string; position: [number, number, number] };

// The instructor faces positive Z, so their left is positive X. Columns start at the aisle.
export const ROOM_SEATS: RoomSeat[] = Array.from({ length: 6 }, (_, row) =>
  (["L", "R"] as const).flatMap((block) =>
    Array.from({ length: block === "L" ? 3 : 4 }, (_, column) => ({
      id: `${block}${row + 1}-${column + 1}`,
      position: [
        (block === "L" ? 1 : -1) * (1.5 + column * 1.45),
        0,
        -3.7 + row * 1.75,
      ] as [number, number, number],
    })),
  ),
).flat();
