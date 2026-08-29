import { Mat4, Quat, Vec3 } from "playcanvas";

export const REVERANCE_SPLAT_ROTATION = Object.freeze([0, 0, 180]);
export const REVERANCE_FLOOR_ROTATION = Object.freeze([
  -179.71965180947012,
  8.877656364351859,
  -179.92406130155297,
]);
export const REVERANCE_FLOOR_HIGHLIGHT_HEIGHT = 0.08075279872482334;
export const REVERANCE_FLOOR_PHASE = 0.5;
export const REVERANCE_FLOOR_VISUAL_Y_OFFSET = REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.07;
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

const FLOOR_ROTATION_QUATERNION = new Quat().setFromEulerAngles(...REVERANCE_FLOOR_ROTATION);

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
) {
  if (Math.abs(candidateClipW) < REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON) return 0;

  const halfHeight = REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5;
  const adjustedY = fragmentLocalY + REVERANCE_FLOOR_VISUAL_Y_OFFSET;
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

export function pickFloorFromScreen(cameraEntity, cssX, cssY, canvasWidth, canvasHeight) {
  const camera = cameraEntity?.camera;
  if (!camera || canvasWidth <= 0 || canvasHeight <= 0) return null;

  const screenCenter = new Vec3();
  const screenUpper = new Vec3();
  const screenLower = new Vec3();
  const screenLeft = new Vec3();
  const screenRight = new Vec3();
  let bandFloor = null;
  let bandScore = Infinity;
  let nearestFloor = null;
  let nearestDistance = Infinity;

  for (const volume of REVERANCE_FLOOR_VOLUMES) {
    const floorToWorld = getFloorWorldTransform(volume);
    const center = floorToWorld.transformPoint(new Vec3(0, 0, 0));
    camera.worldToScreen(center, screenCenter);

    const dx = cssX - screenCenter.x;
    const dy = cssY - screenCenter.y;
    const distance = Math.hypot(dx, dy);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestFloor = volume.number;
    }

    const upper = floorToWorld.transformPoint(new Vec3(0, REVERANCE_FLOOR_PICK_HALF_SIZE[1], 0));
    const lower = floorToWorld.transformPoint(new Vec3(0, -REVERANCE_FLOOR_PICK_HALF_SIZE[1], 0));
    const left = floorToWorld.transformPoint(new Vec3(-REVERANCE_FLOOR_PICK_HALF_SIZE[0], 0, 0));
    const right = floorToWorld.transformPoint(new Vec3(REVERANCE_FLOOR_PICK_HALF_SIZE[0], 0, 0));
    camera.worldToScreen(upper, screenUpper);
    camera.worldToScreen(lower, screenLower);
    camera.worldToScreen(left, screenLeft);
    camera.worldToScreen(right, screenRight);

    const top = Math.min(screenUpper.y, screenLower.y);
    const bottom = Math.max(screenUpper.y, screenLower.y);
    const minX = Math.min(screenLeft.x, screenRight.x);
    const maxX = Math.max(screenLeft.x, screenRight.x);
    if (cssY < top || cssY > bottom || cssX < minX || cssX > maxX) continue;

    const score = Math.abs(cssY - screenCenter.y) + Math.abs(cssX - screenCenter.x) * 0.35;
    if (score < bandScore) {
      bandScore = score;
      bandFloor = volume.number;
    }
  }

  if (bandFloor !== null) return bandFloor;

  const near = new Vec3();
  const far = new Vec3();
  camera.screenToWorld(cssX, cssY, camera.nearClip, near);
  camera.screenToWorld(cssX, cssY, camera.farClip, far);
  const rayDir = new Vec3().sub2(far, near);
  const dirLength = rayDir.length();
  if (dirLength <= Number.EPSILON) return nearestFloor;
  rayDir.mulScalar(1 / dirLength);

  let rayFloor = null;
  let rayScore = Infinity;
  for (const volume of REVERANCE_FLOOR_VOLUMES) {
    const worldToLocal = getWorldToFloorTransform(volume);
    const distance = intersectRayFloorVolume(
      near,
      rayDir,
      worldToLocal,
      REVERANCE_FLOOR_PICK_HALF_SIZE,
    );
    if (distance === null) continue;

    const hitPoint = new Vec3().add2(
      near,
      new Vec3(rayDir.x * distance, rayDir.y * distance, rayDir.z * distance),
    );
    const centerScore = Math.abs(worldToLocal.transformPoint(hitPoint).y);
    if (centerScore < rayScore) {
      rayScore = centerScore;
      rayFloor = volume.number;
    }
  }

  return rayFloor ?? nearestFloor;
}
