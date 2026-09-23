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

const multiBlockSnapshot = {
  ...snapshot,
  blockName: "A + B Blocks",
  inventoryComplete: true,
  blocks: [
    { id: "ReveranceA", code: "A", name: "A Block", floors: snapshot.floors },
    {
      id: "ReveranceB",
      code: "B",
      name: "B Block",
      floors: snapshot.floors.map((floor) => ({
        ...floor,
        id: `B-${floor.id}`,
        shapes: floor.shapes.map((shape) => ({ ...shape, id: `B-${shape.id}` })),
        units: floor.units.map((unit) => ({
          ...unit,
          id: `B-${unit.id}`,
          block: "B",
          blockId: "ReveranceB",
        })),
      })),
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

    await user.click(await screen.findByRole("button", { name: /Residence 411, floor 4/i }, { timeout: 15000 }));

    expect(await screen.findByRole("dialog", { name: /Floor 04/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Live availability")).toBeInTheDocument());
    expect(floorLoader).toHaveBeenCalledWith("ReveranceA", 4);

    await user.click(screen.getByRole("button", { name: /Residence 411, Reserved/i }));
    expect(screen.getByRole("heading", { name: "Residence 411" })).toBeInTheDocument();
    expect(screen.getAllByText("51.2 m²").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Reserved residence/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Open 2D PLAN of residence 411 full screen/i }));
    expect(screen.getByRole("dialog", { name: /Expanded 2D PLAN · RESIDENCE 411/i })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /Expanded 2D PLAN · RESIDENCE 411/i })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /Floor 04/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  }, 30000);

  it("keeps the verified snapshot when the live service fails and supports filters and floor navigation", async () => {
    const user = userEvent.setup();
    render(<ResidenceExplorer onBrokerAccess={vi.fn()} snapshotLoader={() => Promise.resolve(snapshot)} floorLoader={() => Promise.reject(new Error("offline"))} />);

    await user.click(await screen.findByRole("button", { name: /Floor 04/i }));
    expect(await screen.findByText("Verified snapshot")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Available" }));
    const list = screen.getByLabelText("Floor residences");
    expect(within(list).getByRole("button", { name: /#411/i })).toHaveClass("is-available");
    expect(within(list).queryByRole("button", { name: /#412/i })).not.toBeInTheDocument();

    await user.click(within(list).getByRole("button", { name: "All" }));
    await user.click(screen.getByRole("button", { name: "Next floor" }));
    expect(await screen.findByRole("heading", { name: "Floor 05" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Residence 501, Sold/i })).toHaveClass("is-sold");
    expect(within(list).getByRole("button", { name: /#501/i })).toHaveClass("is-sold");

    await user.click(within(list).getByRole("button", { name: "Sold" }));
    const soldRow = within(list).getByRole("button", { name: /#501/i });
    expect(soldRow).toHaveClass("is-sold");
    await user.click(soldRow);
    expect(await screen.findByRole("heading", { name: "Residence 501" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Open 2D PLAN of residence 501 full screen/i }));
    expect(screen.getByRole("dialog", { name: /Expanded 2D PLAN · RESIDENCE 501/i })).toBeInTheDocument();
  });

  it("opens the floor menu in the modal and changes floors without a native select popup", async () => {
    const user = userEvent.setup();
    render(<ResidenceExplorer onBrokerAccess={vi.fn()} snapshotLoader={() => Promise.resolve(snapshot)} floorLoader={() => Promise.resolve([])} />);

    await user.click(await screen.findByRole("button", { name: /Floor 04/i }));
    const modal = await screen.findByRole("dialog", { name: /Floor 04/i });
    const trigger = within(modal).getByRole("button", { name: "Floor 04" });
    await user.click(trigger);

    const menu = screen.getByRole("listbox", { name: "Select floor" });
    expect(within(menu).getByRole("option", { name: "Floor 05" })).toBeInTheDocument();
    await user.click(within(menu).getByRole("option", { name: "Floor 05" }));

    expect(await screen.findByRole("heading", { name: "Floor 05" })).toBeInTheDocument();
    expect(screen.queryByRole("listbox", { name: "Select floor" })).not.toBeInTheDocument();
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

  it("enables 3D floor controls on entry and starts the filter transition once the explorer pins", async () => {
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
    await waitFor(() => expect(explorer.style.getPropertyValue("--filter-progress")).toBe("0.0000"));
    const enteringFilterProgress = Number(explorer.style.getPropertyValue("--filter-progress"));

    explorer.getBoundingClientRect = vi.fn(() => ({ top: -96, bottom: 2504, left: 0, right: 1280, width: 1280, height: 2600 }));
    fireEvent.scroll(window);
    await waitFor(() => expect(Number(explorer.style.getPropertyValue("--filter-progress"))).toBeGreaterThan(enteringFilterProgress));

    explorer.getBoundingClientRect = vi.fn(() => ({ top: -1768, bottom: 832, left: 0, right: 1280, width: 1280, height: 2600 }));
    fireEvent.scroll(window);
    await waitFor(() => expect(explorer).toHaveAttribute("data-settled", "true"));
    expect(explorer.style.getPropertyValue("--filter-progress")).toBe("1.0000");

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
    expect(container.querySelector(".model-static-fallback polygon.is-filter-match")).toBeNull();

    await user.click(within(controls).getByRole("button", { name: "SOLD" }));
    expect(screen.getByRole("button", { name: /Residence 501, floor 5, area unavailable, Sold/i })).toHaveClass("is-sold");
    await user.click(screen.getByRole("button", { name: /Reset filters/i }));

    await user.selectOptions(within(controls).getByLabelText("FLOOR"), "4");
    expect(container.querySelector(".model-static-fallback polygon.is-filter-match")).toHaveAttribute("aria-label", expect.stringMatching(/Floor 04/i));

    await user.click(screen.getByRole("button", { name: /Reset filters/i }));
    expect(within(controls).getByLabelText("FLOOR")).toHaveValue("all");
    expect(container.querySelector(".model-static-fallback polygon.is-filter-match")).toBeNull();

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

  it("lists every snapshot floor in the filter, including floors with no live units", async () => {
    render(
      <ResidenceExplorer
        onBrokerAccess={vi.fn()}
        snapshotLoader={() => Promise.resolve({
          ...snapshot,
          floors: [
            { id: 2, number: 2, planImage: "/floor-2.webp", shapes: [], units: [] },
            ...snapshot.floors,
          ],
        })}
        floorLoader={vi.fn()}
      />,
    );

    const controls = await screen.findByLabelText("Filter Project Reverance residences");
    const floorSelect = within(controls).getByLabelText("FLOOR");
    expect(floorSelect).toHaveTextContent("FLOOR 02");
    expect(floorSelect).toHaveTextContent("FLOOR 04");
    expect(floorSelect).toHaveTextContent("FLOOR 05");
  });

  it("keeps the second block filterable and opens a residence against its own floor data", async () => {
    const user = userEvent.setup();
    const floorLoader = vi.fn().mockResolvedValue([]);
    render(
      <ResidenceExplorer
        onBrokerAccess={vi.fn()}
        snapshotLoader={() => Promise.resolve(multiBlockSnapshot)}
        floorLoader={floorLoader}
      />,
    );

    const controls = await screen.findByLabelText("Filter Project Reverance residences");
    const buildingSelect = within(controls).getByLabelText("BUILDING");
    expect(buildingSelect).toHaveValue("all");
    await user.selectOptions(buildingSelect, "ReveranceB");

    const result = screen.getByRole("button", { name: /Residence 411, floor 4/i });
    expect(result).toHaveTextContent("B · #411");
    await user.click(result);

    const dialog = await screen.findByRole("dialog", { name: /Floor 04/i });
    expect(within(dialog).getByText("B Block")).toBeInTheDocument();
    expect(floorLoader).not.toHaveBeenCalled();
  });

  it("opens a requested Golden Premium apartment with its own block, status and plan", async () => {
    const premiumSnapshot = {
      ...multiBlockSnapshot,
      blocks: multiBlockSnapshot.blocks.map((block) => ({
        ...block,
        floors: [...block.floors, {
          id: `${block.code}-13`,
          number: 13,
          planImage: `/floor-${block.code}-13.webp`,
          shapes: [],
          units: [{
            id: `${block.code}-1305`,
            name: "1305",
            block: block.code,
            blockId: block.id,
            floor: 13,
            status: block.code === "A" ? "available" : "reserved",
            totalArea: 32.4,
            rooms: null,
            bedrooms: null,
            areas: [],
            image2d: `/assets/reverance-pdf/${block.code}1305-plan.webp`,
            image3d: `/assets/reverance-pdf/${block.code}1305-render.webp`,
          }],
        }],
      })),
    };
    const snapshotLoader = () => Promise.resolve(premiumSnapshot);
    const floorLoader = vi.fn();
    const props = { onBrokerAccess: vi.fn(), snapshotLoader, floorLoader };
    const { rerender } = render(<ResidenceExplorer {...props} requestedApartment={{ code: "A1305" }} />);

    let dialog = await screen.findByRole("dialog", { name: /Floor 13/i });
    expect(within(dialog).getByText("A Block")).toBeInTheDocument();
    expect(await within(dialog).findByRole("heading", { name: "Residence 1305" })).toBeInTheDocument();
    expect(within(dialog).getByText("€52,164")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Open 2D PLAN of residence 1305 full screen/i }).querySelector("img"))
      .toHaveAttribute("src", "/assets/reverance-pdf/A1305-plan.webp");

    rerender(<ResidenceExplorer {...props} requestedApartment={{ code: "B1305" }} />);
    dialog = await screen.findByRole("dialog", { name: /Floor 13/i });
    await waitFor(() => expect(within(dialog).getByText("B Block")).toBeInTheDocument());
    expect(within(dialog).getByText("€50,771")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Reserved residence/i })).toBeDisabled();
    expect(floorLoader).not.toHaveBeenCalled();
  });
});
