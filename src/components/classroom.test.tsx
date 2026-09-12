import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Classroom from "./classroom";
import { STORAGE_KEY } from "../lib/storage";
vi.mock("next/dynamic", () => ({
  default: () =>
    function Scene({
      navigationEnabled,
      cameraCommand,
      onSelectSeat,
    }: {
      navigationEnabled: boolean;
      cameraCommand: unknown;
      onSelectSeat: (id: string) => void;
    }) {
      return (
        <div>
          <output aria-label="Navigation enabled">
            {String(navigationEnabled)}
          </output>
          <output aria-label="Camera command">
            {JSON.stringify(cameraCommand)}
          </output>
          <button onClick={() => onSelectSeat("L1-1")}>Mock 3D seat</button>
        </div>
      );
    },
}));
beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      revision: 1,
      sections: [
        {
          id: "s",
          name: "Test section",
          archived: false,
          students: [
            {
              id: "a",
              name: "Synthetic Learner",
              number: "01",
              archived: false,
            },
          ],
          assignments: { "L1-1": "a" },
        },
      ],
    }),
  );
});
it("gates navigation and releases it on keyup, blur and hidden tabs", () => {
  render(<Classroom />);
  const status = () => screen.getByLabelText("Navigation enabled").textContent;
  expect(status()).toBe("false");
  fireEvent.keyDown(window, { code: "Space", key: " " });
  expect(status()).toBe("true");
  fireEvent.keyUp(window, { code: "Space" });
  expect(status()).toBe("false");
  fireEvent.keyDown(window, { code: "Space" });
  fireEvent.blur(window);
  expect(status()).toBe("false");
  fireEvent.keyDown(window, { code: "Space" });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  fireEvent(document, new Event("visibilitychange"));
  expect(status()).toBe("false");
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});
it("ignores shortcuts while typing and runs explicit presets otherwise", () => {
  render(<Classroom />);
  const command = () =>
    JSON.parse(screen.getByLabelText("Camera command").textContent!);
  const input = screen.getByLabelText("Search students");
  fireEvent.keyDown(input, { key: "t", code: "KeyT" });
  expect(command().preset).toBe("reset");
  fireEvent.keyDown(input, { key: " ", code: "Space" });
  expect(screen.getByLabelText("Navigation enabled").textContent).toBe("false");
  fireEvent.keyDown(window, { key: "i", code: "KeyI" });
  expect(command().preset).toBe("instructor");
  fireEvent.keyDown(window, { key: "t", code: "KeyT" });
  expect(command().preset).toBe("top");
  fireEvent.keyDown(window, { key: "r", code: "KeyR" });
  expect(command().preset).toBe("reset");
});
it("seat and search selections preserve camera until explicit Focus", () => {
  render(<Classroom />);
  const initial = screen.getByLabelText("Camera command").textContent;
  fireEvent.click(screen.getByRole("button", { name: "Mock 3D seat" }));
  expect(screen.getByLabelText("Camera command").textContent).toBe(initial);
  fireEvent.click(screen.getByRole("button", { name: /Synthetic Learner/ }));
  expect(screen.getByLabelText("Camera command").textContent).toBe(initial);
  fireEvent.click(screen.getByRole("button", { name: "Focus" }));
  expect(
    JSON.parse(screen.getByLabelText("Camera command").textContent!).preset,
  ).toBe("focus");
});
it("touch navigation toggles explicitly and stops on blur", () => {
  render(<Classroom />);
  const toggle = screen.getByRole("button", { name: "Navigate room" });
  fireEvent.click(toggle);
  expect(screen.getByLabelText("Navigation enabled").textContent).toBe("true");
  fireEvent.blur(window);
  expect(screen.getByLabelText("Navigation enabled").textContent).toBe("false");
});
