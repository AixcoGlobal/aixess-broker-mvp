import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Calculators from "./Calculators.jsx";
import { LanguageProvider } from "../i18n.jsx";

beforeEach(() => { localStorage.setItem("aixess-language", "en"); window.history.replaceState({}, "", "/#calculators"); });
afterEach(() => { localStorage.removeItem("aixess-language"); window.history.replaceState({}, "", "/"); });

describe("calculator user flow", () => {
  it("opens a linked calculator and computes its example", () => {
    window.history.replaceState({}, "", "/#calculators?tool=finance");
    render(<LanguageProvider><Calculators /></LanguageProvider>);
    expect(screen.getByRole("tab", { name: "FINANCING" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
    expect(screen.getByText("€485.85")).toBeInTheDocument();
  });
  it("clears stale results and validates the payment total", () => {
    render(<LanguageProvider><Calculators /></LanguageProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
    expect(screen.getByText("€9,000.00")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Down payment (%)"), { target: { value: "20" } });
    expect(screen.queryByText("€9,000.00")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
    expect(screen.getByRole("alert")).toHaveTextContent("must total 100%");
  });
  it("uses translated errors and localized results", () => {
    localStorage.setItem("aixess-language", "de");
    render(<LanguageProvider><Calculators /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText("Immobilienpreis (€)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Berechnen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Geben Sie in jedes Feld eine Zahl ein.");
    fireEvent.click(screen.getByRole("button", { name: "Beispiel zurücksetzen" }));
    fireEvent.click(screen.getByRole("button", { name: "Berechnen" }));
    expect(screen.getByText(/9\.000,00/)).toBeInTheDocument();
  });
  it("switches tabs with the keyboard and retains entered assumptions", () => {
    render(<LanguageProvider><Calculators /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText("Property price (€)"), { target: { value: "120000" } });
    fireEvent.keyDown(screen.getByRole("tab", { name: "PAYMENT PLAN" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "RENTAL YIELD" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "PAYMENT PLAN" }));
    expect(screen.getByLabelText("Property price (€)")).toHaveValue(120000);
  });
});
