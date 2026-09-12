import { ROOM_SEATS } from "./room-layout";

export type CameraCommand = {
  preset: "reset" | "instructor" | "top" | "focus";
  seatId?: string;
  sequence?: number;
};
export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

export function getCameraPose(command: CameraCommand): CameraPose {
  if (command.preset === "focus") {
    const seat = ROOM_SEATS.find(
      (candidate) => candidate.id === command.seatId,
    );
    if (seat) {
      const [x, , z] = seat.position;
      return { position: [x + 0.5, 4.8, z - 5.2], target: [x, 0.8, z] };
    }
  }
  if (command.preset === "instructor")
    return { position: [-0.7, 5.3, -12.5], target: [-0.7, 0.5, 0.5] };
  if (command.preset === "top")
    return { position: [-0.7, 23, -0.01], target: [-0.7, 0, 0] };
  return { position: [-0.7, 16, -19], target: [-0.7, 0, 0] };
}

export function canSelectSeat(
  navigationEnabled: boolean,
  dragDistance: number,
) {
  return !navigationEnabled && dragDistance <= 4;
}
