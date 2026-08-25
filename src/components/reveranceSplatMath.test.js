import { describe, expect, it } from "vitest";
import {
  createFloorVolumes,
  getCameraPathPose,
  getKeyboardFloorTarget,
  getSplatPose,
} from "./reveranceSplatMath";

describe("Reverance splat scroll pose", () => {
  it("moves continuously from the measured side pose to the front pose", () => {
    expect(getSplatPose(0)).toEqual({ rotationY: -73.3386, positionX: 6.2, scale: 0.91 });
    expect(getSplatPose(1)).toEqual({ rotationY: 0, positionX: 0, scale: 1 });
    expect(getSplatPose(0.5).rotationY).toBeCloseTo(-36.6693, 4);
    expect(getSplatPose(-1)).toEqual(getSplatPose(0));
    expect(getSplatPose(2)).toEqual(getSplatPose(1));
  });

  it("settles immediately in reduced-motion mode", () => {
    expect(getSplatPose(0, true)).toEqual({ rotationY: 0, positionX: 0, scale: 1 });
  });
});

describe("Reverance calibrated camera path", () => {
  const focus = [0, 0, 0];
  const side = [4, 0, 0];
  const front = [0, 0, 4];

  it("moves on a continuous spherical arc without collapsing toward the building", () => {
    expect(getCameraPathPose(0, side, front, focus).position).toEqual(side);
    expect(getCameraPathPose(1, side, front, focus).position).toEqual(front);
    const middle = getCameraPathPose(0.5, side, front, focus).position;
    expect(Math.hypot(...middle)).toBeCloseTo(4, 8);
    expect(middle[0]).toBeCloseTo(Math.SQRT1_2 * 4, 8);
    expect(middle[2]).toBeCloseTo(Math.SQRT1_2 * 4, 8);
  });

  it("clamps progress and settles immediately for reduced motion", () => {
    expect(getCameraPathPose(-2, side, front, focus).position).toEqual(side);
    expect(getCameraPathPose(2, side, front, focus).position).toEqual(front);
    expect(getCameraPathPose(0, side, front, focus, true).position).toEqual(front);
  });
});

describe("Reverance splat floor interaction volumes", () => {
  const floors = Array.from({ length: 15 }, (_, index) => ({ number: index + 2 }));

  it("creates exactly 15 measured, vertically aligned pick volumes", () => {
    const volumes = createFloorVolumes(floors);
    expect(volumes).toHaveLength(15);
    expect(volumes[0].floorNumber).toBe(2);
    expect(volumes[0].position).toEqual([0, 7.015, 0]);
    expect(volumes[0].scale[0]).toBe(35.2);
    expect(volumes[0].scale[1]).toBeCloseTo(2.97, 5);
    expect(volumes[0].scale[2]).toBe(25.5);
    expect(volumes.at(-1).floorNumber).toBe(16);
    expect(volumes.at(-1).position[1]).toBeCloseTo(49.715, 5);
  });

  it("caps unexpected inventory at 15 volumes", () => {
    const tooManyFloors = Array.from({ length: 20 }, (_, index) => index + 1);
    expect(createFloorVolumes(tooManyFloors)).toHaveLength(15);
  });

  it("provides deterministic external side-rail keyboard navigation", () => {
    expect(getKeyboardFloorTarget(floors, 8, "ArrowUp")).toBe(9);
    expect(getKeyboardFloorTarget(floors, 8, "ArrowDown")).toBe(7);
    expect(getKeyboardFloorTarget(floors, 8, "Home")).toBe(16);
    expect(getKeyboardFloorTarget(floors, 8, "End")).toBe(2);
    expect(getKeyboardFloorTarget(floors, 16, "ArrowUp")).toBe(16);
    expect(getKeyboardFloorTarget(floors, 2, "ArrowDown")).toBe(2);
  });
});
