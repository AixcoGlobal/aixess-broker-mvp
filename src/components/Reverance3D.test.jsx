import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Reverance3D } from "./Reverance3D";

const snapshot = {
  buildingImage: "/building.webp",
  buildingShapes: [{
    id: "floor-4",
    target: "4",
    points: [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ],
  }],
  floors: [{
    number: 4,
    units: [{ name: "401", status: "available" }],
  }],
};

describe("Reverance official 3D reconstruction", () => {
  it("keeps floor selection available when a WebGL2 renderer is unavailable", () => {
    const onSelectFloor = vi.fn();
    render(
      <Reverance3D
        snapshot={snapshot}
        onSelectFloor={onSelectFloor}
        settled
        progressRef={{ current: 1 }}
      />,
    );

    expect(screen.getByAltText("Project Reverance A Block front elevation")).toBeInTheDocument();
    const floor = screen.getByRole("button", { name: /Floor 04, 1 available residence/i });
    fireEvent.click(floor);
    expect(onSelectFloor).toHaveBeenCalledWith(4);
  });

  it("supports keyboard selection in the static fallback", () => {
    const onSelectFloor = vi.fn();
    render(
      <Reverance3D
        snapshot={snapshot}
        onSelectFloor={onSelectFloor}
        settled
        progressRef={{ current: 1 }}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /Floor 04/i }), { key: "Enter" });
    expect(onSelectFloor).toHaveBeenCalledWith(4);
  });
});
