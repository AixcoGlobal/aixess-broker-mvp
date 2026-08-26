const DEFAULT_FLOOR_LAYOUT = Object.freeze({
  firstFloorNumber: 2,
  firstFloorCenter: 7.015,
  floorHeight: 3.05,
  width: 35.2,
  depth: 25.5,
  maximumFloors: 15,
});

export const REVERANCE_SPLAT_FLOOR_LAYOUT = DEFAULT_FLOOR_LAYOUT;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function vectorLength(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalizeVector(vector) {
  const length = vectorLength(vector);
  if (length <= Number.EPSILON) return [0, 0, 0];
  return vector.map((component) => component / length);
}

function slerpDirection(start, end, amount) {
  const dot = clamp(
    start[0] * end[0] + start[1] * end[1] + start[2] * end[2],
    -1,
    1,
  );
  const angle = Math.acos(dot);
  if (angle < 1e-5) {
    return normalizeVector(start.map((component, index) => lerp(component, end[index], amount)));
  }

  const denominator = Math.sin(angle);
  const startWeight = Math.sin((1 - amount) * angle) / denominator;
  const endWeight = Math.sin(amount * angle) / denominator;
  return normalizeVector(start.map(
    (component, index) => component * startWeight + end[index] * endWeight,
  ));
}

export function getSplatPose(progress, reducedMotion = false) {
  if (reducedMotion) {
    return { rotationY: 0, positionX: 0, scale: 1 };
  }

  const normalized = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const eased = smoothstep(normalized);

  return {
    rotationY: lerp(-73.3386, 0, eased),
    positionX: lerp(6.2, 0, eased),
    scale: lerp(0.91, 1, eased),
  };
}

/**
 * Interpolate between two calibrated Otium camera positions on a spherical arc.
 * Keeping the camera on the solved level orbit avoids the hidden-surface failures
 * caused by rotating the view-dependent splat itself or tilting above the source.
 */
export function getCameraPathPose(
  progress,
  startPosition,
  endPosition,
  focusPoint,
  reducedMotion = false,
) {
  const normalized = reducedMotion
    ? 1
    : clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const eased = smoothstep(normalized);
  const startOffset = startPosition.map((value, index) => value - focusPoint[index]);
  const endOffset = endPosition.map((value, index) => value - focusPoint[index]);
  const startRadius = vectorLength(startOffset);
  const endRadius = vectorLength(endOffset);
  const direction = slerpDirection(
    normalizeVector(startOffset),
    normalizeVector(endOffset),
    eased,
  );
  const radius = lerp(startRadius, endRadius, eased);

  return {
    position: focusPoint.map((value, index) => value + direction[index] * radius),
    target: [...focusPoint],
  };
}

export function createFloorVolumes(floors, layout = {}) {
  const resolvedLayout = { ...DEFAULT_FLOOR_LAYOUT, ...layout };
  const floorNumbers = [...new Set(
    (floors || [])
      .map((floor) => Number(typeof floor === "number" ? floor : floor?.number))
      .filter(Number.isFinite),
  )]
    .sort((a, b) => a - b)
    .slice(0, resolvedLayout.maximumFloors);

  return floorNumbers.map((number) => ({
    floorNumber: number,
    position: [
      0,
      resolvedLayout.firstFloorCenter
        + (number - resolvedLayout.firstFloorNumber) * resolvedLayout.floorHeight,
      0,
    ],
    scale: [
      resolvedLayout.width,
      Math.max(0.01, resolvedLayout.floorHeight - 0.08),
      resolvedLayout.depth,
    ],
  }));
}

export function getKeyboardFloorTarget(floors, currentFloor, key) {
  const floorNumbers = [...new Set(
    (floors || [])
      .map((floor) => Number(typeof floor === "number" ? floor : floor?.number))
      .filter(Number.isFinite),
  )].sort((a, b) => a - b);

  if (floorNumbers.length === 0) return null;
  if (key === "Home") return floorNumbers.at(-1);
  if (key === "End") return floorNumbers[0];

  const currentIndex = floorNumbers.indexOf(Number(currentFloor));
  const safeIndex = currentIndex === -1 ? floorNumbers.length - 1 : currentIndex;

  if (key === "ArrowUp" || key === "PageUp") {
    return floorNumbers[Math.min(floorNumbers.length - 1, safeIndex + 1)];
  }
  if (key === "ArrowDown" || key === "PageDown") {
    return floorNumbers[Math.max(0, safeIndex - 1)];
  }

  return currentIndex === -1 ? floorNumbers.at(-1) : Number(currentFloor);
}

export function getCanvasScreenPoint(pointer, bounds, canvasSize) {
  const cssWidth = Math.max(1, Number(bounds?.width) || 0);
  const cssHeight = Math.max(1, Number(bounds?.height) || 0);
  const renderWidth = Math.max(cssWidth, Number(canvasSize?.width) || 0);
  const renderHeight = Math.max(cssHeight, Number(canvasSize?.height) || 0);

  return {
    x: (Number(pointer?.x) || 0) * renderWidth / cssWidth,
    y: (Number(pointer?.y) || 0) * renderHeight / cssHeight,
  };
}

export function getFloorTooltipPosition(
  pointer,
  bounds,
  tooltip = { width: 122, height: 64 },
) {
  const gutter = 12;
  const offset = 16;
  const verticalOffset = 18;
  const safeWidth = Math.max(tooltip.width + gutter * 2, Number(bounds?.width) || 0);
  const safeHeight = Math.max(tooltip.height + gutter * 2, Number(bounds?.height) || 0);
  const pointerX = clamp(Number(pointer?.x) || 0, 0, safeWidth);
  const pointerY = clamp(Number(pointer?.y) || 0, 0, safeHeight);
  const preferredX = pointerX + offset;
  const flippedX = pointerX - tooltip.width - offset;
  const x = preferredX + tooltip.width <= safeWidth - gutter
    ? preferredX
    : Math.max(gutter, flippedX);
  const preferredY = pointerY - tooltip.height - verticalOffset;
  const y = preferredY >= gutter
    ? preferredY
    : Math.min(safeHeight - tooltip.height - gutter, pointerY + verticalOffset);

  return { x, y };
}
