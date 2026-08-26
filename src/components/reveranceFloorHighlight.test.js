import { describe, expect, it } from "vitest";
import { Vec3 } from "playcanvas";
import {
  getFloorWorldTransform,
  REVERANCE_FLOOR_SIZE,
  REVERANCE_FLOOR_VOLUMES,
  getWorldToFloorTransform,
} from "./reveranceFloorHighlight";

const FLOOR_13_ANCHORS = [
  { source: [0.876604054, 0.069629623, 0.097623214], target: [-0.491418765, -0.011970474, -0.194788960] },
  { source: [-0.038621183, 0.099713621, -0.423745848], target: [0.493262330, 0.021155566, 0.178940605] },
  { source: [0.354159780, 0.101161803, 0.354733817], target: [-0.014953673, 0.018616293, -0.529592822] },
  { source: [0.467594655, 0.059285096, -0.697034089], target: [0.035339511, -0.018239978, 0.527265290] },
];

function expectVectorClose(actual, expected, precision = 5) {
  expect(actual.x).toBeCloseTo(expected[0], precision);
  expect(actual.y).toBeCloseTo(expected[1], precision);
  expect(actual.z).toBeCloseTo(expected[2], precision);
}

function isInsideFloor(point) {
  return point.toArray().every((value, index) => (
    Math.abs(value) <= REVERANCE_FLOOR_SIZE[index] * 0.5 + 1e-6
  ));
}

describe("Reverance production floor highlight transform", () => {
  it("keeps every calibrated floor center inside the expanded A-block envelope", () => {
    REVERANCE_FLOOR_VOLUMES.forEach((volume) => {
      const floorLocal = getWorldToFloorTransform(volume).transformPoint(
        new Vec3(...volume.position),
      );

      expect(isInsideFloor(floorLocal)).toBe(true);
    });
  });

  it("covers the complete measured width and depth of floor 13", () => {
    const floor = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 13);
    const transform = getWorldToFloorTransform(floor);

    FLOOR_13_ANCHORS.forEach(({ source, target }) => {
      const floorLocal = transform.transformPoint(new Vec3(...source));
      expectVectorClose(floorLocal, target, 4);
      expect(isInsideFloor(floorLocal)).toBe(true);
    });
  });

  it("keeps every floor center and both vertical boundaries out of adjacent storeys", () => {
    const halfHeight = REVERANCE_FLOOR_SIZE[1] * 0.5;

    REVERANCE_FLOOR_VOLUMES.forEach((floor, index) => {
      const floorToWorld = getFloorWorldTransform(floor);
      const floorPoints = [
        new Vec3(0, 0, 0),
        new Vec3(0, -halfHeight, 0),
        new Vec3(0, halfHeight, 0),
      ].map((point) => floorToWorld.transformPoint(point));

      [REVERANCE_FLOOR_VOLUMES[index - 1], REVERANCE_FLOOR_VOLUMES[index + 1]]
        .filter(Boolean)
        .forEach((adjacentFloor) => {
          const adjacentTransform = getWorldToFloorTransform(adjacentFloor);
          floorPoints.forEach((point) => {
            expect(isInsideFloor(adjacentTransform.transformPoint(point))).toBe(false);
          });
        });
    });
  });

  it("uses the same adjusted world-space center for picking and highlighting", () => {
    REVERANCE_FLOOR_VOLUMES.forEach((volume) => {
      const worldCenter = getFloorWorldTransform(volume).transformPoint(Vec3.ZERO);
      const floorLocal = getWorldToFloorTransform(volume).transformPoint(worldCenter);
      expectVectorClose(floorLocal, [0, 0, 0]);
    });
  });
});
