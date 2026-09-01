export function normalizeWheelDelta(event) {
  let deltaX = Number(event?.deltaX) || 0;
  let deltaY = Number(event?.deltaY) || 0;
  const deltaMode = Number(event?.deltaMode) || 0;

  if (deltaMode === 1) {
    const lineHeight = 16;
    deltaX *= lineHeight;
    deltaY *= lineHeight;
  } else if (deltaMode === 2) {
    const pageSize = typeof window !== "undefined" ? window.innerHeight || 0 : 0;
    deltaX *= pageSize;
    deltaY *= pageSize;
  }

  return { deltaX, deltaY };
}

export function getPageScrollRoots() {
  const roots = [
    document.scrollingElement,
    document.documentElement,
    document.body,
  ].filter(Boolean);

  return [...new Set(roots)];
}

export function isPointWithinRect(x, y, rect) {
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function scrollPageByDelta(deltaX, deltaY) {
  if (deltaX === 0 && deltaY === 0) return false;

  const root = document.scrollingElement;
  if (root) {
    root.scrollTop += deltaY;
    root.scrollLeft += deltaX;
    return true;
  }

  if (typeof window !== "undefined" && typeof window.scrollBy === "function") {
    window.scrollBy({ top: deltaY, left: deltaX });
    return true;
  }

  return false;
}
