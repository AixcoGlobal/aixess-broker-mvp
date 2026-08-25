import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReveranceSplatPrototype } from "./ReveranceSplatPrototype";

describe("Reverance splat prototype shell", () => {
  it("exposes a useful error when the SOG URL is missing", async () => {
    const onStateChange = vi.fn();
    const { container } = render(
      <ReveranceSplatPrototype onStateChange={onStateChange} reducedMotion />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("A Reverance SOG URL is required.");
    expect(container.firstChild).toHaveAttribute("data-load-state", "error");
    expect(container.firstChild).toHaveAttribute("data-reduced-motion", "true");
    expect(container.firstChild).toHaveAttribute("data-settled", "false");
    expect(onStateChange).toHaveBeenCalledWith({
      status: "error",
      progress: 0,
      error: "A Reverance SOG URL is required.",
    });
  });
});
