import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Onboarding from "./onboarding";
describe("onboarding", () => {
  it("asks for count then creates named empty sections", () => {
    const complete = vi.fn();
    render(<Onboarding onComplete={complete} busy={false} />);
    fireEvent.change(screen.getByLabelText("Number of sections"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Section 1"), {
      target: { value: "Morning" },
    });
    fireEvent.change(screen.getByLabelText("Section 2"), {
      target: { value: "Afternoon" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open my classroom" }));
    expect(complete).toHaveBeenCalledWith(["Morning", "Afternoon"]);
  });
  it("does not accept a blank section name", () => {
    const complete = vi.fn();
    render(<Onboarding onComplete={complete} busy={false} />);
    fireEvent.change(screen.getByLabelText("Number of sections"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.submit(screen.getByLabelText("Name your sections"));
    expect(complete).not.toHaveBeenCalled();
  });
});
