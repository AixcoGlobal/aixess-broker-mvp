import { Mat4, Quat, Vec3 } from "playcanvas";

export const REVERANCE_SPLAT_ROTATION = Object.freeze([0, 0, 180]);
export const REVERANCE_FLOOR_ROTATION = Object.freeze([
  -179.71965180947012,
  8.877656364351859,
  -179.92406130155297,
]);
export const REVERANCE_FLOOR_HIGHLIGHT_HEIGHT = 0.08075279872482334;
export const REVERANCE_FLOOR_PHASE = 0.5;
export const REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM = REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.07;
export const REVERANCE_FLOOR_VISUAL_Y_OFFSET_TOP = REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.55;
export const REVERANCE_FLOOR_VISUAL_Y_OFFSET = REVERANCE_FLOOR_VISUAL_Y_OFFSET_BOTTOM;
export const REVERANCE_FLOOR_LOCAL_CENTER = Object.freeze([
  -0.12,
  -REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * REVERANCE_FLOOR_PHASE,
  -0.282,
]);
export const REVERANCE_FLOOR_SIZE = Object.freeze([
  1.04,
  0.07267751885234101,
  1.12,
]);
export const REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER = 0.00035;
export const REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON = 1e-5;
export const REVERANCE_FLOOR_VOLUMES = Object.freeze([
  [2, 0.3465929124598087, -0.8097063560444595, -0.46356909413651887],
  [3, 0.3465468627576663, -0.7289545140944962, -0.46395948241105345],
  [4, 0.3465008130555239, -0.6482026721445328, -0.464349870685588],
  [5, 0.3464547633533815, -0.5674508301945694, -0.46474025896012255],
  [6, 0.34640871365123904, -0.486698988244606, -0.46513064723465714],
  [7, 0.34636266394909665, -0.4059471462946426, -0.46552103550919166],
  [8, 0.34631661424695426, -0.3251953043446792, -0.46591142378372624],
  [9, 0.3462705645448118, -0.24444346239471576, -0.46630181205826077],
  [10, 0.3462245148426694, -0.16369162044475238, -0.46669220033279535],
  [11, 0.346178465140527, -0.08293977849478897, -0.46708258860732993],
  [12, 0.3461324154383846, -0.002187936544825593, -0.46747297688186445],
  [13, 0.3460863657362422, 0.07856390540513782, -0.46786336515639904],
  [14, 0.3460403160340998, 0.15931574735510118, -0.46825375343093356],
  [15, 0.3459942663319574, 0.24006758930506455, -0.46864414170546814],
  [16, 0.34594821662981495, 0.32081943125502793, -0.4690345299800027],
].map(([number, x, y, z]) => Object.freeze({ number, position: Object.freeze([x, y, z]) })));

// The official SOG contains the paired A/B towers in one coordinate space.
// A's calibrated bands are retained as the public default for compatibility;
// B uses the measured horizontal separation between the two tower masses.
// Keeping this as a world-space offset keeps the highlight aligned with the
// complete B façade through the calibrated orbit instead of tinting its side.
export const REVERANCE_BLOCK_B_OFFSET = Object.freeze([-0.83, 0, 0]);
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
    FLOOR_ROTATION_QUATERNION,
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
    FLOOR_ROTATION_QUATERNION,
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

/**
 * Maximum CSS-pixel distance from the nearest projected floor band at which a
 * pointer that misses every floor volume still resolves to that floor. This
 * keeps thin slab edges forgiving without lighting a floor up from open sky.
 */
export const REVERANCE_FLOOR_PICK_TOLERANCE_PX = 14;

const pickCenter = new Vec3();
const pickUpper = new Vec3();
const pickLower = new Vec3();
const pickLeft = new Vec3();
const pickRight = new Vec3();
const pickScreenCenter = new Vec3();
const pickScreenUpper = new Vec3();
const pickScreenLower = new Vec3();
const pickScreenLeft = new Vec3();
const pickScreenRight = new Vec3();
const pickNear = new Vec3();
const pickFar = new Vec3();
const pickRayDir = new Vec3();
const pickHitPoint = new Vec3();
const pickLocalPoint = new Vec3();

export function pickFloorFromScreen(cameraEntity, cssX, cssY, canvasWidth, canvasHeight, volumes = REVERANCE_FLOOR_VOLUMES) {
  const camera = cameraEntity?.camera;
  if (!camera || canvasWidth <= 0 || canvasHeight <= 0) return null;
  if (!Number.isFinite(cssX) || !Number.isFinite(cssY)) return null;

  const cameraPosition = cameraEntity.getPosition();
  const cameraForward = cameraEntity.forward;
  const isInFrontOfCamera = (point) => (
    (point.x - cameraPosition.x) * cameraForward.x
    + (point.y - cameraPosition.y) * cameraForward.y
    + (point.z - cameraPosition.z) * cameraForward.z
  ) > camera.nearClip;

  let bandFloor = null;
  let bandScore = Infinity;
  let nearestFloor = null;
  let nearestBandDistance = Infinity;

  for (const volume of volumes) {
    const floorToWorld = getFloorWorldTransform(volume);
    floorToWorld.transformPoint(pickCenter.set(0, 0, 0), pickCenter);
    floorToWorld.transformPoint(pickUpper.set(0, REVERANCE_FLOOR_PICK_HALF_SIZE[1], 0), pickUpper);
    floorToWorld.transformPoint(pickLower.set(0, -REVERANCE_FLOOR_PICK_HALF_SIZE[1], 0), pickLower);
    floorToWorld.transformPoint(pickLeft.set(-REVERANCE_FLOOR_PICK_HALF_SIZE[0], 0, 0), pickLeft);
    floorToWorld.transformPoint(pickRight.set(REVERANCE_FLOOR_PICK_HALF_SIZE[0], 0, 0), pickRight);

    // Points behind (or on) the near plane project to nonsense; never let them form a band.
    if (
      !isInFrontOfCamera(pickCenter)
      || !isInFrontOfCamera(pickUpper)
      || !isInFrontOfCamera(pickLower)
      || !isInFrontOfCamera(pickLeft)
      || !isInFrontOfCamera(pickRight)
    ) {
      continue;
    }

    camera.worldToScreen(pickCenter, pickScreenCenter);
    camera.worldToScreen(pickUpper, pickScreenUpper);
    camera.worldToScreen(pickLower, pickScreenLower);
    camera.worldToScreen(pickLeft, pickScreenLeft);
    camera.worldToScreen(pickRight, pickScreenRight);

    const top = Math.min(pickScreenUpper.y, pickScreenLower.y);
    const bottom = Math.max(pickScreenUpper.y, pickScreenLower.y);
    const minX = Math.min(pickScreenLeft.x, pickScreenRight.x);
    const maxX = Math.max(pickScreenLeft.x, pickScreenRight.x);

    const outsideX = Math.max(minX - cssX, 0, cssX - maxX);
    const outsideY = Math.max(top - cssY, 0, cssY - bottom);
    const bandDistance = Math.hypot(outsideX, outsideY);
    if (bandDistance < nearestBandDistance) {
      nearestBandDistance = bandDistance;
      nearestFloor = volume.number;
    }
    if (bandDistance > 0) continue;

    const score = Math.abs(cssY - pickScreenCenter.y) + Math.abs(cssX - pickScreenCenter.x) * 0.35;
    if (score < bandScore) {
      bandScore = score;
      bandFloor = volume.number;
    }
  }

  if (bandFloor !== null) return bandFloor;

  const tolerantFloor = nearestBandDistance <= REVERANCE_FLOOR_PICK_TOLERANCE_PX ? nearestFloor : null;

  camera.screenToWorld(cssX, cssY, camera.nearClip, pickNear);
  camera.screenToWorld(cssX, cssY, camera.farClip, pickFar);
  pickRayDir.sub2(pickFar, pickNear);
  const dirLength = pickRayDir.length();
  if (dirLength <= Number.EPSILON) return tolerantFloor;
  pickRayDir.mulScalar(1 / dirLength);

  let rayFloor = null;
  let rayScore = Infinity;
  for (const volume of volumes) {
    const worldToLocal = getWorldToFloorTransform(volume);
    const distance = intersectRayFloorVolume(
      pickNear,
      pickRayDir,
      worldToLocal,
      REVERANCE_FLOOR_PICK_HALF_SIZE,
    );
    if (distance === null) continue;

    pickHitPoint.set(
      pickNear.x + pickRayDir.x * distance,
      pickNear.y + pickRayDir.y * distance,
      pickNear.z + pickRayDir.z * distance,
    );
    const centerScore = Math.abs(worldToLocal.transformPoint(pickHitPoint, pickLocalPoint).y);
    if (centerScore < rayScore) {
      rayScore = centerScore;
      rayFloor = volume.number;
    }
  }

  return rayFloor ?? tolerantFloor;
}

/**
 * Picks a storey from either official tower. The legacy picker above remains
 * floor-number-only for callers that only render the A block.
 */
export function pickBlockFloorFromScreen(cameraEntity, cssX, cssY, canvasWidth, canvasHeight) {
  const camera = cameraEntity?.camera;
  if (!camera || canvasWidth <= 0 || canvasHeight <= 0) return null;
  if (!Number.isFinite(cssX) || !Number.isFinite(cssY)) return null;

  // The projected rectangles of the two towers can overlap at oblique
  // angles. Ask the calibrated picker for each tower, then choose the nearest
  // projected candidate instead of letting object iteration order decide.
  const candidates = [];
  for (const [blockId, volumes] of Object.entries(REVERANCE_BLOCK_FLOOR_VOLUMES)) {
    const floor = pickFloorFromScreen(cameraEntity, cssX, cssY, canvasWidth, canvasHeight, volumes);
    if (floor === null) continue;
    const volume = volumes.find((candidate) => candidate.number === floor);
    const floorToWorld = getFloorWorldTransform(volume);
    floorToWorld.transformPoint(pickCenter.set(0, 0, 0), pickCenter);
    floorToWorld.transformPoint(pickUpper.set(0, REVERANCE_FLOOR_PICK_HALF_SIZE[1], 0), pickUpper);
    floorToWorld.transformPoint(pickLower.set(0, -REVERANCE_FLOOR_PICK_HALF_SIZE[1], 0), pickLower);
    floorToWorld.transformPoint(pickLeft.set(-REVERANCE_FLOOR_PICK_HALF_SIZE[0], 0, 0), pickLeft);
    floorToWorld.transformPoint(pickRight.set(REVERANCE_FLOOR_PICK_HALF_SIZE[0], 0, 0), pickRight);
    camera.worldToScreen(pickUpper, pickScreenUpper);
    camera.worldToScreen(pickLower, pickScreenLower);
    camera.worldToScreen(pickLeft, pickScreenLeft);
    camera.worldToScreen(pickRight, pickScreenRight);
    camera.worldToScreen(pickCenter, pickScreenCenter);
    const top = Math.min(pickScreenUpper.y, pickScreenLower.y);
    const bottom = Math.max(pickScreenUpper.y, pickScreenLower.y);
    const minX = Math.min(pickScreenLeft.x, pickScreenRight.x);
    const maxX = Math.max(pickScreenLeft.x, pickScreenRight.x);
    const outsideX = Math.max(minX - cssX, 0, cssX - maxX);
    const outsideY = Math.max(top - cssY, 0, cssY - bottom);
    candidates.push({
      blockId,
      floor,
      bandDistance: Math.hypot(outsideX, outsideY),
      centerDistance: Math.hypot(cssX - pickScreenCenter.x, cssY - pickScreenCenter.y),
    });
  }
  if (!candidates.length) return null;
  let validatedCandidates = candidates;
  if (candidates.some(({ bandDistance }) => bandDistance > 0)) {
    camera.screenToWorld(cssX, cssY, camera.nearClip, pickNear);
    camera.screenToWorld(cssX, cssY, camera.farClip, pickFar);
    pickRayDir.sub2(pickFar, pickNear);
    const dirLength = pickRayDir.length();
    const hitFloors = new Set();
    if (dirLength > Number.EPSILON) {
      pickRayDir.mulScalar(1 / dirLength);
      for (const [blockId, volumes] of Object.entries(REVERANCE_BLOCK_FLOOR_VOLUMES)) {
        for (const volume of volumes) {
          if (intersectRayFloorVolume(
            pickNear,
            pickRayDir,
            getWorldToFloorTransform(volume),
            REVERANCE_FLOOR_PICK_HALF_SIZE,
          ) !== null) hitFloors.add(`${blockId}:${volume.number}`);
        }
      }
    }
    validatedCandidates = candidates.filter(({ blockId, floor, bandDistance }) => (
      bandDistance <= 0 || hitFloors.has(`${blockId}:${floor}`)
    ));
    if (!validatedCandidates.length) return null;
  }
  const inside = validatedCandidates.filter(({ bandDistance }) => bandDistance <= 0);
  const pool = inside.length ? inside : validatedCandidates;
  pool.sort((a, b) => a.centerDistance - b.centerDistance || a.bandDistance - b.bandDistance);

  // If two projected candidates are exactly tied (the usual case in the
  // visual gap between the towers), use the ray only to validate that the
  // pointer actually enters a block volume. A gap hit must remain unselected;
  // this prevents a neighboring tower from lighting up through empty space.
  const nearestDistance = pool[0].centerDistance;
  const tied = pool.filter(({ centerDistance }) => Math.abs(centerDistance - nearestDistance) < 1e-6);
  if (tied.length > 1) {
    camera.screenToWorld(cssX, cssY, camera.nearClip, pickNear);
    camera.screenToWorld(cssX, cssY, camera.farClip, pickFar);
    pickRayDir.sub2(pickFar, pickNear);
    const dirLength = pickRayDir.length();
    const hitBlocks = new Set();
    if (dirLength > Number.EPSILON) {
      pickRayDir.mulScalar(1 / dirLength);
      for (const [blockId, volumes] of Object.entries(REVERANCE_BLOCK_FLOOR_VOLUMES)) {
        if (volumes.some((volume) => intersectRayFloorVolume(
          pickNear,
          pickRayDir,
          getWorldToFloorTransform(volume),
          REVERANCE_FLOOR_PICK_HALF_SIZE,
        ) !== null)) hitBlocks.add(blockId);
      }
    }
    const tiedHits = tied.filter(({ blockId }) => hitBlocks.has(blockId));
    if (tiedHits.length === 1) return { blockId: tiedHits[0].blockId, floor: tiedHits[0].floor };
    if (tiedHits.length === 0) return null;
  }
  return { blockId: pool[0].blockId, floor: pool[0].floor };
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
