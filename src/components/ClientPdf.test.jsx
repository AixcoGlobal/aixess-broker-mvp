import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientPdf from "./ClientPdf.jsx";
import { CLIENT_PDF_COPY } from "../client-pdf-copy.js";

const mocks = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("../utils/clientPdf.js", () => ({ downloadClientPdf: mocks.download }));
beforeEach(() => { mocks.download.mockReset().mockResolvedValue(undefined); });
const props = { locale: "en", active: "payment", values: ["90000", "10", "30", "60", "24"], ready: true };
describe("client PDF form", () => {
  it("disables download for missing or stale results", () => {
    const { rerender } = render(<ClientPdf {...props} ready={false} />);
    expect(screen.getByRole("button", { name: "CREATE CLIENT PDF" })).toBeDisabled();
    rerender(<ClientPdf {...props} />);
    expect(screen.getByRole("button", { name: "CREATE CLIENT PDF" })).toBeEnabled();
  });
  it("downloads the selected apartment and current client details without persisting them", async () => {
    const store = vi.spyOn(Storage.prototype, "setItem");
    render(<ClientPdf {...props} />);
    fireEvent.change(screen.getByLabelText("Selected apartment"), { target: { value: "A1401" } });
    fireEvent.change(screen.getByLabelText("Client name (optional)"), { target: { value: "Test Client" } });
    fireEvent.change(screen.getByLabelText("Client address (optional)"), { target: { value: "Test Street 1\nTest City" } });
    fireEvent.click(screen.getByRole("button", { name: "CREATE CLIENT PDF" }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith({
      locale: "en", calculatorId: "payment", values: props.values, apartmentCode: "A1401",
      clientName: "Test Client", clientAddress: "Test Street 1\nTest City",
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("PDF downloaded.");
    expect(store).not.toHaveBeenCalled();
    store.mockRestore();
  });
  it("allows retry after a generation failure", async () => {
    mocks.download.mockRejectedValueOnce(Error("asset"));
    render(<ClientPdf {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "CREATE CLIENT PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not create");
    fireEvent.click(screen.getByRole("button", { name: "CREATE CLIENT PDF" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("PDF downloaded."));
  });
  it.each(["de", "pl", "sl", "ru"])("shows localized controls in %s", locale => {
    render(<ClientPdf {...props} locale={locale} />);
    expect(screen.getByLabelText(CLIENT_PDF_COPY[locale].address)).toHaveAttribute("maxlength", "300");
    expect(screen.getByRole("button", { name: CLIENT_PDF_COPY[locale].download })).toBeEnabled();
  });
});
