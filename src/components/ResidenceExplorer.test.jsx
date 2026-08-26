import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResidenceExplorer } from "./ResidenceExplorer";

const square = [
  { x: 10, y: 10 },
  { x: 90, y: 10 },
  { x: 90, y: 90 },
  { x: 10, y: 90 },
];

const snapshot = {
  schemaVersion: 1,
  blockId: "ReveranceA",
  buildingImage: "/building.webp",
  motionFrames: ["/side.jpg", "/middle.jpg"],
  buildingShapes: [
    { id: "floor-4", target: "4", points: square },
    { id: "floor-5", target: "5", points: square },
  ],
  floors: [
    {
      id: 4,
      number: 4,
      planImage: "/floor-4.webp",
      shapes: [
        { id: "411", target: "411", points: square },
        { id: "412", target: "412", points: square },
      ],
      units: [
        { id: 411, name: "411", status: "available", floor: 4, rooms: 2, bedrooms: 1, totalArea: 51.2, image2d: "/411.png", image3d: "/411.webp", price: null, areas: [{ id: 1, label: "Bedroom", size: 12.4 }] },
        { id: 412, name: "412", status: "reserved", floor: 4, rooms: 3, bedrooms: 2, totalArea: 64.8, image2d: null, image3d: null, price: null, areas: [] },
      ],
    },
    {
      id: 5,
      number: 5,
      planImage: "/floor-5.webp",
      shapes: [{ id: "501", target: "501", points: square }],
      units: [],
    },
  ],
};

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

describe("Residence explorer", () => {
  it("opens a floor, refreshes inventory, reveals residence details, and closes with Escape", async () => {
    const user = userEvent.setup();
    const floorLoader = vi.fn().mockResolvedValue([
      { ...snapshot.floors[0].units[0], status: "reserved" },
      snapshot.floors[0].units[1],
    ]);

    render(<ResidenceExplorer onBrokerAccess={vi.fn()} snapshotLoader={() => Promise.resolve(snapshot)} floorLoader={floorLoader} />);

    const floorButton = await screen.findByRole("button", { name: /Floor 04, 1 available residence/i });
    await user.click(floorButton);

    expect(await screen.findByRole("dialog", { name: /Floor 04/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Live availability")).toBeInTheDocument());
    expect(floorLoader).toHaveBeenCalledWith("ReveranceA", 4);

    await user.click(screen.getByRole("button", { name: /Residence 411, Reserved/i }));
    expect(screen.getByRole("heading", { name: "Residence 411" })).toBeInTheDocument();
    expect(screen.getAllByText("51.2 m²").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Reserved residence/i })).toBeDisabled();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the verified snapshot when the live service fails and supports filters and floor navigation", async () => {
    const user = userEvent.setup();
    render(<ResidenceExplorer onBrokerAccess={vi.fn()} snapshotLoader={() => Promise.resolve(snapshot)} floorLoader={() => Promise.reject(new Error("offline"))} />);

    await user.click(await screen.findByRole("button", { name: /Floor 04/i }));
    expect(await screen.findByText("Verified snapshot")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Available" }));
    const list = screen.getByLabelText("Floor residences");
    expect(within(list).getByRole("button", { name: /#411/i })).toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: /#412/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next floor" }));
    expect(await screen.findByRole("heading", { name: "Floor 05" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Residence 501, Sold/i })).toBeInTheDocument();
  });

  it("hands an available residence into the broker access journey", async () => {
    const user = userEvent.setup();
    const onBrokerAccess = vi.fn();
    render(<ResidenceExplorer onBrokerAccess={onBrokerAccess} snapshotLoader={() => Promise.resolve(snapshot)} floorLoader={() => Promise.resolve(snapshot.floors[0].units)} />);

    await user.click(await screen.findByRole("button", { name: /Floor 04/i }));
    await user.click(await screen.findByRole("button", { name: /Residence 411, Available/i }));
    await user.click(screen.getByRole("button", { name: /Request this residence/i }));

    expect(onBrokerAccess).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("recovers from an initial snapshot failure without a reload", async () => {
    const user = userEvent.setup();
    const snapshotLoader = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(snapshot);

    render(<ResidenceExplorer onBrokerAccess={vi.fn()} snapshotLoader={snapshotLoader} floorLoader={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Residence explorer unavailable");

    await user.click(screen.getByRole("button", { name: /Try again/i }));
    expect(await screen.findByRole("button", { name: /Floor 04/i })).toBeInTheDocument();
    expect(snapshotLoader).toHaveBeenCalledTimes(2);
  });

  it("enables floor controls as soon as the explorer is visible during scroll", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { container } = render(<ResidenceExplorer onBrokerAccess={vi.fn()} snapshotLoader={() => Promise.resolve(snapshot)} floorLoader={vi.fn()} />);
    const explorer = container.querySelector(".residence-explorer");
    expect(explorer).toBeInTheDocument();

    Object.defineProperty(explorer, "offsetHeight", { configurable: true, value: 2600 });
    explorer.getBoundingClientRect = vi.fn(() => ({ top: 180, bottom: 2780, left: 0, right: 1280, width: 1280, height: 2600 }));
    fireEvent.scroll(window);

    await waitFor(() => expect(explorer).toHaveAttribute("data-interactive", "true"));
    expect(explorer).toHaveAttribute("data-settled", "false");

    explorer.getBoundingClientRect = vi.fn(() => ({ top: 900, bottom: 3500, left: 0, right: 1280, width: 1280, height: 2600 }));
    fireEvent.scroll(window);
    await waitFor(() => expect(explorer).toHaveAttribute("data-interactive", "false"));
  });

  it("filters residences by floor, bedrooms, area, and status while linking the result to the building and modal", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ResidenceExplorer
        onBrokerAccess={vi.fn()}
        snapshotLoader={() => Promise.resolve(snapshot)}
        floorLoader={() => Promise.resolve(snapshot.floors[0].units)}
      />,
    );

    const controls = await screen.findByLabelText("Filter Project Reverance residences");
    await waitFor(() => expect(controls.closest(".residence-filter-panel")).toHaveAttribute("aria-hidden", "false"));
    expect(screen.getByText("1 MATCH")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Residence 411, floor 4/i })).toBeInTheDocument();
    expect(container.querySelector(".model-static-fallback polygon.is-filter-match")).toHaveAttribute("aria-label", expect.stringMatching(/Floor 04/i));

    await user.selectOptions(within(controls).getByLabelText("FLOOR"), "4");
    await user.click(within(controls).getByRole("button", { name: "2" }));
    await user.click(within(within(controls).getByRole("group", { name: "AVAILABILITY" })).getByRole("button", { name: "ALL" }));
    fireEvent.change(within(controls).getByLabelText("Minimum area"), { target: { value: "60" } });

    const reservedResult = screen.getByRole("button", { name: /Residence 412, floor 4, 64.8 square metres, Reserved/i });
    expect(reservedResult).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Residence 411, floor 4/i })).not.toBeInTheDocument();

    await user.click(reservedResult);
    expect(await screen.findByRole("dialog", { name: /Floor 04/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Residence 412" })).toBeInTheDocument();
  });
});
