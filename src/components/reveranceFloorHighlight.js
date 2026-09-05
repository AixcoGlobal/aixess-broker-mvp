import { Mat4, Quat, Vec3 } from "playcanvas";

export const REVERANCE_SPLAT_ROTATION = Object.freeze([0, 0, 180]);
export const REVERANCE_FLOOR_ROTATION = Object.freeze([
  -179.71965180947012,
  8.877656364351859,
  -179.92406130155297,
]);
export const REVERANCE_FLOOR_HIGHLIGHT_HEIGHT = 0.0774;
export const REVERANCE_FLOOR_PHASE = 0.5;
export const REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM = 0;
export const REVERANCE_FLOOR_VISUAL_Y_OFFSET_TOP = 0;
export const REVERANCE_FLOOR_VISUAL_Y_OFFSET = REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM;
export const REVERANCE_FLOOR_LOCAL_CENTER = Object.freeze([
  -0.12,
  -REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * REVERANCE_FLOOR_PHASE,
  -0.282,
]);
export const REVERANCE_FLOOR_SIZE = Object.freeze([
  0.62,
  REVERANCE_FLOOR_HIGHLIGHT_HEIGHT,
  0.95,
]);
export const REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER = 0.00035;
export const REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON = 1e-5;
// Slab spacing measured on the occupied façade: floor 2 through floor 16.
// One shared boundary per pair of floors prevents gaps and overlapping bands.
export const REVERANCE_FLOOR_VOLUMES = Object.freeze(
  Array.from({ length: 15 }, (_, index) => Object.freeze({
    number: index + 2,
    position: Object.freeze([
      0.3465929124598087 - index * REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.000570255157,
      -0.7929 + index * REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.999988138676,
      -0.46356909413651887 - index * REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.004834362306,
    ]),
  })),
);

// The official SOG contains the paired A/B towers in one coordinate space.
// A's calibrated bands are retained as the public default for compatibility;
// B uses the measured horizontal separation between the two tower masses.
// Keeping this as a world-space offset keeps the highlight aligned with the
// complete B façade through the calibrated orbit instead of tinting its side.
export const REVERANCE_BLOCK_B_OFFSET = Object.freeze([-1.05, 0, 0.54]);
const offsetVolume = (volume, offset) => Object.freeze({
  number: volume.number,
  position: Object.freeze(volume.position.map((value, index) => value + offset[index])),
});
export const REVERANCE_BLOCK_FLOOR_VOLUMES = Object.freeze({
  ReveranceA: REVERANCE_FLOOR_VOLUMES,
  ReveranceB: Object.freeze(REVERANCE_FLOOR_VOLUMES.map((volume) => offsetVolume(volume, REVERANCE_BLOCK_B_OFFSET))),
});

export function getFloorVolumesForBlock(blockId = "ReveranceA") {
  return REVERANCE_BLOCK_FLOOR_VOLUMES[blockId] || REVERANCE_FLOOR_VOLUMES;
}

const FLOOR_ROTATION_QUATERNION = new Quat().setFromEulerAngles(...REVERANCE_FLOOR_ROTATION);
// Fit to the four façade planes in the accepted SOG, not a screen rectangle.
// Both towers run along a 27.3° yaw; retain the measured slab normal/tilt.
const floorUp = FLOOR_ROTATION_QUATERNION.transformVector(Vec3.UP);
const footprintYaw = 27.3 * Math.PI / 180;
const floorRight = new Vec3(Math.cos(footprintYaw), 0, -Math.sin(footprintYaw));
floorRight.y = -(floorRight.x * floorUp.x + floorRight.z * floorUp.z) / floorUp.y;
floorRight.normalize();
const floorBack = new Vec3().cross(floorRight, floorUp).normalize();
const floorBasis = new Mat4().set([
  ...floorRight.toArray(), 0, ...floorUp.toArray(), 0, ...floorBack.toArray(), 0, 0, 0, 0, 1,
]);
const FOOTPRINT_ROTATION_QUATERNION = new Quat().setFromMat4(floorBasis);
const FIRST_HIGHLIGHT_FLOOR = REVERANCE_FLOOR_VOLUMES[0].number;
const LAST_HIGHLIGHT_FLOOR = REVERANCE_FLOOR_VOLUMES[REVERANCE_FLOOR_VOLUMES.length - 1].number;

export function getFloorVisualYOffset(floorNumber) {
  const span = LAST_HIGHLIGHT_FLOOR - FIRST_HIGHLIGHT_FLOOR;
  const t = span <= 0
    ? 0
    : Math.min(1, Math.max(0, (Number(floorNumber) - FIRST_HIGHLIGHT_FLOOR) / span));
  const upperBias = t * t;
  return REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM
    + (REVERANCE_FLOOR_VISUAL_Y_OFFSET_TOP - REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM) * upperBias;
}

export function getFloorWorldTransform(volume) {
  const center = FLOOR_ROTATION_QUATERNION
    .transformVector(new Vec3(...REVERANCE_FLOOR_LOCAL_CENTER))
    .add(new Vec3(...volume.position));

  return new Mat4().setTRS(
    center,
    FOOTPRINT_ROTATION_QUATERNION,
    Vec3.ONE,
  );
}

export function getHighlightWorldToFloorTransform(volume) {
  const visualYOffset = getFloorVisualYOffset(volume.number);
  const center = FLOOR_ROTATION_QUATERNION
    .transformVector(new Vec3(
      REVERANCE_FLOOR_LOCAL_CENTER[0],
      REVERANCE_FLOOR_LOCAL_CENTER[1] - visualYOffset,
      REVERANCE_FLOOR_LOCAL_CENTER[2],
    ))
    .add(new Vec3(...volume.position));

  return new Mat4().setTRS(
    center,
    FOOTPRINT_ROTATION_QUATERNION,
    Vec3.ONE,
  ).invert();
}

export function getWorldToFloorTransform(volume) {
  return getFloorWorldTransform(volume).invert();
}

export function getFloorHighlightProjection(
  viewProjection,
  worldToFloor,
  viewportWidth,
  viewportHeight,
) {
  const inverseViewProjection = viewProjection.clone().invert();
  const floorFromClip = new Mat4().mul2(worldToFloor, inverseViewProjection);
  const viewProjectionData = viewProjection.data;
  const floorFromClipData = floorFromClip.data;
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);

  return {
    worldToClipW: new Float32Array([
      viewProjectionData[3],
      viewProjectionData[7],
      viewProjectionData[11],
      viewProjectionData[15],
    ]),
    pixelToLocalY: new Float32Array([
      (2 * floorFromClipData[1]) / width,
      (2 * floorFromClipData[5]) / height,
    ]),
  };
}

export function getFloorFragmentLocalY(
  centerLocalY,
  centerClipW,
  pixelOffset,
  pixelToLocalY,
  flipScreenY = false,
) {
  const ySlope = flipScreenY ? -pixelToLocalY[1] : pixelToLocalY[1];
  return centerLocalY + centerClipW * (
    pixelOffset[0] * pixelToLocalY[0] + pixelOffset[1] * ySlope
  );
}

export function getFloorFragmentHighlightMask(
  fragmentLocalY,
  antialiasWidth,
  candidateClipW = 1,
  visualYOffset = REVERANCE_FLOOR_VISUAL_Y_OFFSET,
) {
  if (Math.abs(candidateClipW) < REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON) return 0;

  const halfHeight = REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5;
  const adjustedY = fragmentLocalY + visualYOffset;
  const width = Math.max(antialiasWidth, REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER);
  const normalizedEdge = Math.min(1, Math.max(
    0,
    (halfHeight - Math.abs(adjustedY)) / width,
  ));
  return normalizedEdge * normalizedEdge * (3 - 2 * normalizedEdge);
}

export const REVERANCE_FLOOR_PICK_HALF_SIZE = Object.freeze([
  REVERANCE_FLOOR_SIZE[0] * 0.5,
  REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5,
  REVERANCE_FLOOR_SIZE[2] * 0.5,
]);

export function intersectRayFloorVolume(rayOrigin, rayDir, worldToLocal, halfSize) {
  const localOrigin = worldToLocal.transformPoint(rayOrigin);
  const localEnd = worldToLocal.transformPoint(new Vec3().add2(rayOrigin, rayDir));
  const localDir = new Vec3().sub2(localEnd, localOrigin);
  const dirLength = localDir.length();
  if (dirLength <= Number.EPSILON) return null;
  localDir.mulScalar(1 / dirLength);

  let tmin = -Infinity;
  let tmax = Infinity;
  const axes = [
    [localOrigin.x, localDir.x, halfSize[0]],
    [localOrigin.y, localDir.y, halfSize[1]],
    [localOrigin.z, localDir.z, halfSize[2]],
  ];

  for (const [origin, direction, half] of axes) {
    if (Math.abs(direction) < 1e-8) {
      if (origin < -half || origin > half) return null;
      continue;
    }
    const invDirection = 1 / direction;
    let t1 = (-half - origin) * invDirection;
    let t2 = (half - origin) * invDirection;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return null;
  }

  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : tmax;
}

// Picking must intersect the visible façade, without a screen-space halo.
export const REVERANCE_FLOOR_PICK_TOLERANCE_PX = 0;

const pickNear = new Vec3();
const pickFar = new Vec3();
const pickRayDir = new Vec3();

function pickNearestFloor(cameraEntity, cssX, cssY, canvasWidth, canvasHeight, blocks) {
  const camera = cameraEntity?.camera;
  if (!camera || canvasWidth <= 0 || canvasHeight <= 0) return null;
  if (!Number.isFinite(cssX) || !Number.isFinite(cssY)) return null;
  if (cssX < 0 || cssY < 0 || cssX > canvasWidth || cssY > canvasHeight) return null;

  camera.screenToWorld(cssX, cssY, camera.nearClip, pickNear);
  camera.screenToWorld(cssX, cssY, camera.farClip, pickFar);
  pickRayDir.sub2(pickFar, pickNear).normalize();

  let closest = null;
  let closestDistance = Infinity;
  for (const [blockId, volumes] of Object.entries(blocks)) {
    for (const volume of volumes) {
      // Use exactly the same slab as the tint. Perspective changes the floor
      // under a pointer at a façade edge; centre-line rectangles cannot do this.
      const distance = intersectRayFloorVolume(
        pickNear, pickRayDir, getHighlightWorldToFloorTransform(volume),
        REVERANCE_FLOOR_PICK_HALF_SIZE,
      );
      if (distance !== null && distance < closestDistance) {
        closestDistance = distance;
        closest = { blockId, floor: volume.number };
      }
    }
  }
  return closest;
}

export function pickFloorFromScreen(cameraEntity, cssX, cssY, canvasWidth, canvasHeight, volumes = REVERANCE_FLOOR_VOLUMES) {
  return pickNearestFloor(cameraEntity, cssX, cssY, canvasWidth, canvasHeight, { ReveranceA: volumes })?.floor ?? null;
}

export function pickBlockFloorFromScreen(cameraEntity, cssX, cssY, canvasWidth, canvasHeight) {
  return pickNearestFloor(cameraEntity, cssX, cssY, canvasWidth, canvasHeight, REVERANCE_BLOCK_FLOOR_VOLUMES);
}

/**
 * Resolves which calibrated storey strictly contains a world-space point, or
 * `null` when the point lies outside every floor volume or exactly on a slab.
 */
export function getFloorAtWorldPoint(worldPoint, volumes = REVERANCE_FLOOR_VOLUMES) {
  const local = new Vec3();
  for (const volume of volumes) {
    getWorldToFloorTransform(volume).transformPoint(worldPoint, local);
    if (
      Math.abs(local.x) < REVERANCE_FLOOR_PICK_HALF_SIZE[0]
      && Math.abs(local.y) < REVERANCE_FLOOR_PICK_HALF_SIZE[1]
      && Math.abs(local.z) < REVERANCE_FLOOR_PICK_HALF_SIZE[2]
    ) {
      return volume.number;
    }
  }
  return null;
}

export function getBlockFloorAtWorldPoint(worldPoint) {
  for (const [blockId, volumes] of Object.entries(REVERANCE_BLOCK_FLOOR_VOLUMES)) {
    const floor = getFloorAtWorldPoint(worldPoint, volumes);
    if (floor !== null) return { blockId, floor };
  }
  return null;
}
