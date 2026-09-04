import { describe, expect, it } from "vitest";
import {
  ASPECT_MANUAL,
  Camera,
  Entity,
  Mat4,
  Vec3,
  Vec4,
} from "playcanvas";
import {
  getFloorAtWorldPoint,
  getBlockFloorAtWorldPoint,
  getFloorFragmentHighlightMask,
  getFloorFragmentLocalY,
  getFloorHighlightProjection,
  getFloorWorldTransform,
  getFloorVisualYOffset,
  getHighlightWorldToFloorTransform,
  intersectRayFloorVolume,
  pickFloorFromScreen,
  REVERANCE_FLOOR_HIGHLIGHT_HEIGHT,
  REVERANCE_FLOOR_PICK_HALF_SIZE,
  REVERANCE_FLOOR_PICK_TOLERANCE_PX,
  REVERANCE_FLOOR_SIZE,
  REVERANCE_FLOOR_VISUAL_Y_OFFSET,
  REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM,
  REVERANCE_FLOOR_VISUAL_Y_OFFSET_TOP,
  REVERANCE_FLOOR_VOLUMES,
  REVERANCE_BLOCK_FLOOR_VOLUMES,
  REVERANCE_BLOCK_B_OFFSET,
  pickBlockFloorFromScreen,
  getWorldToFloorTransform,
} from "./reveranceFloorHighlight";

const FLOOR_13_ANCHORS = [
  { source: [0.876604054, 0.069629623, 0.097623214], target: [-0.491418765, -0.011970474, -0.194788960] },
  { source: [-0.038621183, 0.099713621, -0.423745848], target: [0.493262330, 0.021155566, 0.178940605] },
  { source: [0.354159780, 0.101161803, 0.354733817], target: [-0.014953673, 0.018616293, -0.529592822] },
  { source: [0.467594655, 0.059285096, -0.697034089], target: [0.035339511, -0.018239978, 0.527265290] },
];
const FLOOR_11_GAUSSIAN_272736 = Object.freeze({
  alpha: 0.9980819468710893,
  localCenter: Object.freeze([
    0.41393073428231075,
    0.03047240121742089,
    0.20262440439437512,
  ]),
  verticalSigma: 0.13217495608647423,
});
const CAMERA_TARGET = new Vec3(-0.10454206208274158, 0.0008068618049380962, 0.10121364916726469);
const CAMERA_FRONT = new Vec3(2.571008603437904, -0.010401810476404838, -2.4755136248454392);
const CAMERA_UP = new Vec3(-0.000569128058664063, 0.9999881472011365, -0.004835447289666561);
const VIEWPORT_SIZE = 775;

function getViewProjection(yawDegrees) {
  const offset = CAMERA_FRONT.clone().sub(CAMERA_TARGET);
  const radians = yawDegrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const cameraPosition = new Vec3(
    CAMERA_TARGET.x + offset.x * cosine + offset.z * sine,
    CAMERA_TARGET.y + offset.y,
    CAMERA_TARGET.z - offset.x * sine + offset.z * cosine,
  );
  const camera = new Entity();
  camera.setPosition(cameraPosition);
  camera.lookAt(CAMERA_TARGET, CAMERA_UP);

  const projection = new Mat4().setPerspective(41.09622780396063, 1, 1, 500, false);
  const view = camera.getWorldTransform().clone().invert();
  return new Mat4().mul2(projection, view);
}

/**
 * Builds a camera entity whose `camera` mirrors the CameraComponent API that
 * pickFloorFromScreen relies on (client-pixel worldToScreen / screenToWorld),
 * without needing a graphics device.
 */
function createPickingCamera(yawDegrees) {
  const offset = CAMERA_FRONT.clone().sub(CAMERA_TARGET);
  const radians = yawDegrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const entity = new Entity();
  entity.setPosition(
    CAMERA_TARGET.x + offset.x * cosine + offset.z * sine,
    CAMERA_TARGET.y + offset.y,
    CAMERA_TARGET.z - offset.x * sine + offset.z * cosine,
  );
  entity.lookAt(CAMERA_TARGET, CAMERA_UP);

  const camera = new Camera(null);
  camera.aspectRatioMode = ASPECT_MANUAL;
  camera.aspectRatio = 1;
  camera.fov = 41.09622780396063;
  camera.nearClip = 1;
  camera.farClip = 500;
  camera.node = entity;
  entity.camera = {
    nearClip: camera.nearClip,
    farClip: camera.farClip,
    worldToScreen: (point, out) => camera.worldToScreen(point, VIEWPORT_SIZE, VIEWPORT_SIZE, out),
    screenToWorld: (x, y, z, out) => camera.screenToWorld(x, y, z, VIEWPORT_SIZE, VIEWPORT_SIZE, out),
  };
  return entity;
}

function projectFloorPoint(cameraEntity, floorNumber, localPoint) {
  const volume = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === floorNumber);
  const world = getFloorWorldTransform(volume).transformPoint(localPoint);
  return cameraEntity.camera.worldToScreen(world, new Vec3());
}

function projectBlockFloorPoint(cameraEntity, blockId, floorNumber, localPoint) {
  const volume = REVERANCE_BLOCK_FLOOR_VOLUMES[blockId].find(({ number }) => number === floorNumber);
  const world = getFloorWorldTransform(volume).transformPoint(localPoint);
  return cameraEntity.camera.worldToScreen(world, new Vec3());
}

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
  it("centers every floor between two consecutive calibrated slab lines", () => {
    const halfStorey = REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5;

    REVERANCE_FLOOR_VOLUMES.forEach((volume, index) => {
      const transform = getWorldToFloorTransform(volume);
      const upperSlab = transform.transformPoint(new Vec3(...volume.position));
      expect(upperSlab.y).toBeCloseTo(halfStorey, 6);

      if (index > 0) {
        const lowerSlab = transform.transformPoint(
          new Vec3(...REVERANCE_FLOOR_VOLUMES[index - 1].position),
        );
        expect(lowerSlab.y).toBeCloseTo(-halfStorey, 6);
      }
    });
  });

  it("covers the complete measured width and depth of floor 13", () => {
    const floor = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 13);
    const transform = getWorldToFloorTransform(floor);

    FLOOR_13_ANCHORS.forEach(({ source, target }) => {
      const floorLocal = transform.transformPoint(new Vec3(...source));
      expectVectorClose(floorLocal, [
        target[0],
        target[1] + REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5,
        target[2],
      ], 4);
      expect(Math.abs(floorLocal.x)).toBeLessThanOrEqual(REVERANCE_FLOOR_SIZE[0] * 0.5);
      expect(Math.abs(floorLocal.z)).toBeLessThanOrEqual(REVERANCE_FLOOR_SIZE[2] * 0.5);
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

  it("shifts the visual highlight farther down on upper floors only", () => {
    expect(getFloorVisualYOffset(2)).toBeCloseTo(REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM, 8);
    expect(getFloorVisualYOffset(16)).toBeCloseTo(REVERANCE_FLOOR_VISUAL_Y_OFFSET_TOP, 8);
    expect(getFloorVisualYOffset(2)).toBeCloseTo(REVERANCE_FLOOR_VISUAL_Y_OFFSET, 8);
    expect(getFloorVisualYOffset(16)).toBeGreaterThan(getFloorVisualYOffset(9));
    expect(getFloorVisualYOffset(9)).toBeGreaterThan(getFloorVisualYOffset(2));
  });

  it("moves the highlight volume down the storey without changing pick slab calibration", () => {
    const floor16 = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 16);
    const pickCenter = getFloorWorldTransform(floor16).transformPoint(Vec3.ZERO);
    const highlightLocal = getHighlightWorldToFloorTransform(floor16).transformPoint(pickCenter);
    expect(highlightLocal.x).toBeCloseTo(0, 5);
    expect(highlightLocal.z).toBeCloseTo(0, 5);
    expect(highlightLocal.y).toBeCloseTo(getFloorVisualYOffset(16), 5);
  });

  it("clips the real Floor 11 Gaussian at the fragment boundary without shrinking its center volume", () => {
    const halfHeight = REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5;
    const floor11 = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 11);
    const floor10 = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 10);
    const adjacentCenterY = getWorldToFloorTransform(floor11).transformPoint(
      getFloorWorldTransform(floor10).transformPoint(Vec3.ZERO),
    ).y;

    expect(FLOOR_11_GAUSSIAN_272736.alpha).toBeGreaterThan(0.99);
    expect(FLOOR_11_GAUSSIAN_272736.localCenter.every((value, index) => (
      Math.abs(value) <= REVERANCE_FLOOR_SIZE[index] * 0.5
    ))).toBe(true);
    expect(
      Math.abs(FLOOR_11_GAUSSIAN_272736.localCenter[1])
        + 3 * FLOOR_11_GAUSSIAN_272736.verticalSigma,
    ).toBeGreaterThan(halfHeight);

    expect(getFloorFragmentHighlightMask(
      FLOOR_11_GAUSSIAN_272736.localCenter[1],
      0.001,
    )).toBe(1);
    expect(getFloorFragmentHighlightMask(
      halfHeight - REVERANCE_FLOOR_VISUAL_Y_OFFSET + 1e-6,
      0.001,
    )).toBe(0);
    expect(getFloorFragmentHighlightMask(
      -halfHeight - REVERANCE_FLOOR_VISUAL_Y_OFFSET - 1e-6,
      0.001,
    )).toBe(0);
    expect(getFloorFragmentHighlightMask(adjacentCenterY, 0.001)).toBe(0);
    expect(getFloorFragmentHighlightMask(0, 0.001, 0)).toBe(0);
  });

  it.each([
    ["front", 0],
    ["left oblique", -55],
    ["right oblique", 55],
  ])("reconstructs fragment floor-local Y at the %s camera", (_name, yawDegrees) => {
    const floor11 = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 11);
    const floorToWorld = getFloorWorldTransform(floor11);
    const worldToFloor = getWorldToFloorTransform(floor11);
    const viewProjection = getViewProjection(yawDegrees);
    const inverseViewProjection = viewProjection.clone().invert();
    const { pixelToLocalY, worldToClipW } = getFloorHighlightProjection(
      viewProjection,
      worldToFloor,
      VIEWPORT_SIZE,
      VIEWPORT_SIZE,
    );
    const centerLocal = new Vec3(0.15, -0.012, -0.2);
    const centerWorld = floorToWorld.transformPoint(centerLocal);
    const centerWorldHomogeneous = new Vec4(centerWorld.x, centerWorld.y, centerWorld.z, 1);
    const centerClip = viewProjection.transformVec4(centerWorldHomogeneous);
    const centerClipW = worldToClipW[0] * centerWorld.x
      + worldToClipW[1] * centerWorld.y
      + worldToClipW[2] * centerWorld.z
      + worldToClipW[3];

    expect(centerClipW).toBeCloseTo(centerClip.w, 6);

    const expectReconstruction = (pixelOffset, flipScreenY = false) => {
      const screenYSign = flipScreenY ? -1 : 1;
      const shiftedClip = new Vec4(
        centerClip.x + (2 * pixelOffset[0] * centerClip.w) / VIEWPORT_SIZE,
        centerClip.y + (screenYSign * 2 * pixelOffset[1] * centerClip.w) / VIEWPORT_SIZE,
        centerClip.z,
        centerClip.w,
      );
      const shiftedWorldHomogeneous = inverseViewProjection.transformVec4(shiftedClip);
      const shiftedWorld = new Vec3(
        shiftedWorldHomogeneous.x / shiftedWorldHomogeneous.w,
        shiftedWorldHomogeneous.y / shiftedWorldHomogeneous.w,
        shiftedWorldHomogeneous.z / shiftedWorldHomogeneous.w,
      );
      const directLocalY = worldToFloor.transformPoint(shiftedWorld).y;
      const reconstructedLocalY = getFloorFragmentLocalY(
        centerLocal.y,
        centerClipW,
        pixelOffset,
        pixelToLocalY,
        flipScreenY,
      );

      expect(reconstructedLocalY).toBeCloseTo(directLocalY, 6);
    };

    [[0, 0], [17, -11], [-23, 19]].forEach((pixelOffset) => {
      expectReconstruction(pixelOffset);
    });
    expectReconstruction([13, 9], true);
  });

  it("strictly contains world points inside a storey and rejects its slab lines", () => {
    const floor = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 7);
    const transform = getFloorWorldTransform(floor);

    expect(getFloorAtWorldPoint(transform.transformPoint(new Vec3(0, 0, 0)))).toBe(7);
    expect(getFloorAtWorldPoint(transform.transformPoint(new Vec3(0.53, 0, 0)))).toBeNull();
    expect(getFloorAtWorldPoint(
      transform.transformPoint(new Vec3(0, REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5, 0)),
    )).toBeNull();
  });

  it.each(Object.keys(REVERANCE_BLOCK_FLOOR_VOLUMES))("resolves a world point in block %s without confusing the paired tower", (blockId) => {
    const volume = REVERANCE_BLOCK_FLOOR_VOLUMES[blockId].find(({ number }) => number === 7);
    const worldCenter = getFloorWorldTransform(volume).transformPoint(Vec3.ZERO);
    expect(getBlockFloorAtWorldPoint(worldCenter)).toEqual({ blockId, floor: 7 });
  });

  it("keeps the B-block volumes on the measured separation of the paired SOG", () => {
    expect(REVERANCE_BLOCK_B_OFFSET).toEqual([-0.83, 0, 0.7]);
    const a = REVERANCE_BLOCK_FLOOR_VOLUMES.ReveranceA.find(({ number }) => number === 8);
    const b = REVERANCE_BLOCK_FLOOR_VOLUMES.ReveranceB.find(({ number }) => number === 8);
    b.position.forEach((value, index) => {
      expect(value - a.position[index]).toBeCloseTo(REVERANCE_BLOCK_B_OFFSET[index], 6);
    });
  });

  it.each([
    ["front", 0],
    ["left oblique", -55],
    ["right oblique", 55],
  ])("picks the correct tower and storey from the %s camera", (_name, yawDegrees) => {
    const cameraEntity = createPickingCamera(yawDegrees);
    [16, 11, 5, 2].forEach((floorNumber) => {
      const center = projectBlockFloorPoint(cameraEntity, "ReveranceB", floorNumber, new Vec3(0, 0, 0));
      expect(pickBlockFloorFromScreen(
        cameraEntity,
        center.x,
        center.y,
        VIEWPORT_SIZE,
        VIEWPORT_SIZE,
      )).toEqual({ blockId: "ReveranceB", floor: floorNumber });
    });
  });

  describe.each([
    ["front", 0],
    ["left oblique", -55],
    ["right oblique", 55],
  ])("screen picking from the %s camera", (_name, yawDegrees) => {
    const cameraEntity = createPickingCamera(yawDegrees);

    it("picks the storey under the pointer", () => {
      [16, 11, 5, 2].forEach((floorNumber) => {
        const center = projectFloorPoint(cameraEntity, floorNumber, new Vec3(0, 0, 0));
        expect(pickFloorFromScreen(cameraEntity, center.x, center.y, VIEWPORT_SIZE, VIEWPORT_SIZE))
          .toBe(floorNumber);
      });
    });

    it("never lights a floor from open sky above the roof", () => {
      const roofLine = projectFloorPoint(
        cameraEntity,
        16,
        new Vec3(0, REVERANCE_FLOOR_PICK_HALF_SIZE[1], 0),
      );
      const skyY = roofLine.y - REVERANCE_FLOOR_PICK_TOLERANCE_PX * 4;
      expect(skyY).toBeGreaterThan(0);
      [0.5, 0.2, 0.8].forEach((fraction) => {
        expect(pickFloorFromScreen(
          cameraEntity,
          VIEWPORT_SIZE * fraction,
          skyY,
          VIEWPORT_SIZE,
          VIEWPORT_SIZE,
        )).toBeNull();
      });
      expect(pickFloorFromScreen(cameraEntity, VIEWPORT_SIZE * 0.5, 4, VIEWPORT_SIZE, VIEWPORT_SIZE))
        .toBeNull();
    });

    it("ignores pointers beside the building", () => {
      const center = projectFloorPoint(cameraEntity, 9, new Vec3(0, 0, 0));
      // The oblique cameras frame the building so tightly that a corner can
      // leave the viewport, so measure the true projected silhouette instead of
      // assuming the canvas edges are empty.
      let silhouetteMinX = Infinity;
      let silhouetteMaxX = -Infinity;
      REVERANCE_FLOOR_VOLUMES.forEach(({ number }) => {
        [-1, 1].forEach((signX) => {
          [-1, 1].forEach((signZ) => {
            [-1, 1].forEach((signY) => {
              const corner = projectFloorPoint(cameraEntity, number, new Vec3(
                signX * REVERANCE_FLOOR_PICK_HALF_SIZE[0],
                signY * REVERANCE_FLOOR_PICK_HALF_SIZE[1],
                signZ * REVERANCE_FLOOR_PICK_HALF_SIZE[2],
              ));
              silhouetteMinX = Math.min(silhouetteMinX, corner.x);
              silhouetteMaxX = Math.max(silhouetteMaxX, corner.x);
            });
          });
        });
      });
      const margin = REVERANCE_FLOOR_PICK_TOLERANCE_PX * 3;
      expect(pickFloorFromScreen(
        cameraEntity,
        silhouetteMinX - margin,
        center.y,
        VIEWPORT_SIZE,
        VIEWPORT_SIZE,
      )).toBeNull();
      expect(pickFloorFromScreen(
        cameraEntity,
        silhouetteMaxX + margin,
        center.y,
        VIEWPORT_SIZE,
        VIEWPORT_SIZE,
      )).toBeNull();
    });

    it("resolves the storey whose volume the pointer ray actually enters near the silhouette edge", () => {
      // A pointer just inside the projected silhouette must resolve to a floor
      // via the ray cast even when it misses the narrower centre-line band.
      const center = projectFloorPoint(cameraEntity, 9, new Vec3(0, 0, 0));
      const nearCorner = projectFloorPoint(cameraEntity, 9, new Vec3(
        REVERANCE_FLOOR_PICK_HALF_SIZE[0],
        0,
        REVERANCE_FLOOR_PICK_HALF_SIZE[2],
      ));
      const farCorner = projectFloorPoint(cameraEntity, 9, new Vec3(
        -REVERANCE_FLOOR_PICK_HALF_SIZE[0],
        0,
        -REVERANCE_FLOOR_PICK_HALF_SIZE[2],
      ));
      const insideX = center.x + (nearCorner.x - center.x) * 0.9;
      const picked = pickFloorFromScreen(cameraEntity, insideX, center.y, VIEWPORT_SIZE, VIEWPORT_SIZE);
      expect(picked).not.toBeNull();
      expect(Math.abs(picked - 9)).toBeLessThanOrEqual(1);
      const farInsideX = center.x + (farCorner.x - center.x) * 0.9;
      const farPicked = pickFloorFromScreen(cameraEntity, farInsideX, center.y, VIEWPORT_SIZE, VIEWPORT_SIZE);
      expect(farPicked).not.toBeNull();
      expect(Math.abs(farPicked - 9)).toBeLessThanOrEqual(1);
    });

    it("rejects invalid pointer coordinates", () => {
      expect(pickFloorFromScreen(cameraEntity, Number.NaN, 10, VIEWPORT_SIZE, VIEWPORT_SIZE)).toBeNull();
      expect(pickFloorFromScreen(cameraEntity, 10, 10, 0, VIEWPORT_SIZE)).toBeNull();
      expect(pickFloorFromScreen(null, 10, 10, VIEWPORT_SIZE, VIEWPORT_SIZE)).toBeNull();
    });
  });

  it("resolves the nearest floor along a front-view ray through floor 11", () => {
    const floor11 = REVERANCE_FLOOR_VOLUMES.find(({ number }) => number === 11);
    const centerWorld = getFloorWorldTransform(floor11).transformPoint(new Vec3(0, 0, 0));
    const rayOrigin = CAMERA_FRONT.clone();
    const rayDir = new Vec3().sub2(centerWorld, rayOrigin).normalize();

    let closest = null;
    let closestDistance = Infinity;
    for (const volume of REVERANCE_FLOOR_VOLUMES) {
      const distance = intersectRayFloorVolume(
        rayOrigin,
        rayDir,
        getWorldToFloorTransform(volume),
        REVERANCE_FLOOR_PICK_HALF_SIZE,
      );
      if (distance !== null && distance < closestDistance) {
        closestDistance = distance;
        closest = volume.number;
      }
    }

    expect(closest).toBe(11);
  });
});
