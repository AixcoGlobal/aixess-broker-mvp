import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetworkSections } from "./NetworkSections";

describe("Golden Premium apartment cards", () => {
  it("opens the exact selected apartment from either block", () => {
    const onSelectApartment = vi.fn();
    render(<NetworkSections sections={["opportunity"]} onSelectApartment={onSelectApartment} />);

    expect(screen.getAllByRole("button", { name: /View apartment [AB]\d+/ })).toHaveLength(28);
    fireEvent.click(screen.getByRole("button", { name: "View apartment A1305" }));
    fireEvent.click(screen.getByRole("button", { name: "View apartment B1305" }));

    expect(onSelectApartment).toHaveBeenNthCalledWith(1, "A1305");
    expect(onSelectApartment).toHaveBeenNthCalledWith(2, "B1305");
  });
});
