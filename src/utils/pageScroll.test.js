import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  getPageScrollRoots,
  isPointWithinRect,
  normalizeWheelDelta,
  scrollPageByDelta,
} from "./pageScroll";

describe("pageScroll", () => {
  beforeEach(() => {
    document.documentElement.style.height = "3000px";
    document.body.style.height = "3000px";
    document.documentElement.scrollTop = 1000;
    document.body.scrollTop = 0;
  });

  afterEach(() => {
    document.documentElement.style.height = "";
    document.body.style.height = "";
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });

  it("normalizes line-based wheel deltas to pixels", () => {
    expect(normalizeWheelDelta({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toEqual({
      deltaX: 0,
      deltaY: 48,
    });
  });

  it("scrolls the page root downward and upward", () => {
    const root = { scrollTop: 1000, scrollLeft: 0 };
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      get: () => root,
    });

    scrollPageByDelta(0, 120);
    expect(root.scrollTop).toBe(1120);

    scrollPageByDelta(0, -80);
    expect(root.scrollTop).toBe(1040);
  });

  it("detects whether a pointer is inside a bounding rect", () => {
    expect(isPointWithinRect(50, 50, {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    })).toBe(true);
    expect(isPointWithinRect(150, 50, {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    })).toBe(false);
  });
});
