import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n.jsx";
import { ScrollToTopButton } from "./ScrollToTopButton.jsx";

afterEach(() => {
  vi.restoreAllMocks();
  window.scrollY = 0;
});


describe("scroll-to-top button", () => {
  it("shows after 520px of scrolling, like AIXCO v4, and takes the visitor back to the top", () => {
    const frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    const flushFrames = () => act(() => { while (frames.length) frames.shift()(window.performance.now() + 2000); });
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { container } = render(<LanguageProvider><ScrollToTopButton page="home" /></LanguageProvider>);
    const button = container.querySelector(".scroll-top-button");
    expect(button).toHaveAttribute("aria-label", "Scroll to top");
    expect(button).toHaveAttribute("data-visible", "false");
    expect(button).toHaveAttribute("tabindex", "-1");

    const scrollTo = (y) => {
      act(() => { window.scrollY = y; window.dispatchEvent(new Event("scroll")); });
      flushFrames();
    };
    scrollTo(600);
    expect(button).toHaveAttribute("data-visible", "true");
    expect(button).toHaveAttribute("tabindex", "0");

    fireEvent.click(button);
    flushFrames();
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "instant" });

    scrollTo(400);
    expect(button).toHaveAttribute("data-visible", "false");
  });
});
