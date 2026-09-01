import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getFloorAtWorldPoint, Reverance3D } from "./Reverance3D";
import { getFloorWorldTransform, REVERANCE_FLOOR_HIGHLIGHT_HEIGHT, REVERANCE_FLOOR_VOLUMES } from "./reveranceFloorHighlight";
import { Vec3 } from "playcanvas";

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

  it("blocks canvas wheel handlers without preventing native scroll", () => {
    const { container } = render(
      <Reverance3D
        snapshot={snapshot}
        onSelectFloor={vi.fn()}
        settled
        interactive
        progressRef={{ current: 1 }}
      />,
    );

    const map = container.querySelector(".building-map");
    const canvas = document.createElement("canvas");
    map?.appendChild(canvas);
    const canvasWheel = vi.fn();
    canvas.addEventListener("wheel", canvasWheel);
    const rect = canvas.getBoundingClientRect();

    const event = new WheelEvent("wheel", {
      deltaY: -120,
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.top + rect.height * 0.5,
      bubbles: true,
      cancelable: true,
    });
    const stopPropagation = vi.spyOn(event, "stopPropagation");
    const preventDefault = vi.spyOn(event, "preventDefault");

    canvas.dispatchEvent(event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(canvasWheel).not.toHaveBeenCalled();
  });

  it("enables modified-wheel zoom before the scroll animation has settled", () => {
    const { container } = render(
      <Reverance3D
        snapshot={snapshot}
        onSelectFloor={vi.fn()}
        settled={false}
        interactive
        progressRef={{ current: 0.35 }}
      />,
    );

    const map = container.querySelector(".building-map");
    const canvas = document.createElement("canvas");
    map?.appendChild(canvas);
    const rect = canvas.getBoundingClientRect();
    const event = new WheelEvent("wheel", {
      deltaY: -120,
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.top + rect.height * 0.5,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const stopPropagation = vi.spyOn(event, "stopPropagation");
    const preventDefault = vi.spyOn(event, "preventDefault");

    canvas.dispatchEvent(event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
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

  it("accepts only points inside the exact highlighted floor volume", () => {
    const floor = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 7);
    const transform = getFloorWorldTransform(floor);
    const center = transform.transformPoint(new Vec3(0, 0, 0));
    const outsideFacade = transform.transformPoint(new Vec3(0.53, 0, 0));
    const slabEdge = transform.transformPoint(new Vec3(0, REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5, 0));

    expect(getFloorAtWorldPoint(center)).toBe(7);
    expect(getFloorAtWorldPoint(outsideFacade)).toBeNull();
    expect(getFloorAtWorldPoint(slabEdge)).toBeNull();
  });
});
