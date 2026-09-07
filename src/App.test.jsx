import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

beforeEach(() => {
  window.history.replaceState({}, "", "/#why-aixess");
  window.scrollTo = () => {};
  window.localStorage.removeItem("aixess-language");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("AIXESS navigation pages", () => {
  it("keeps document content off the original homepage and on dedicated pages", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("MOVE THEDEALFORWARD.");
    expect(container.querySelector(".access-section")).toBeInTheDocument();
    expect(container.querySelector(".project-ticker")).toBeInTheDocument();
    expect(container.querySelector("[data-content-section]")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "BROKER ACCESS" })[0]);
    expect(container.querySelector('[data-content-section="introduction"]')).toBeInTheDocument();
    expect(screen.getByText("COMING SOON")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "REQUEST ACCESS" })[0]).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-signup?lang=en");
    expect(screen.getAllByRole("link", { name: "PARTNER SIGN IN" })[0]).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-login?lang=en");
    fireEvent.click(screen.getAllByRole("button", { name: "RESOURCES" })[0]);
    expect(screen.getByRole("link", { name: /OPEN ALL CALCULATORS/i })).toHaveAttribute("href", "#calculators");
  });

  it("routes broker login and registration to the matching Workwise flows", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(screen.getAllByRole("link", { name: "REGISTER" })[0]).toHaveAttribute(
      "href",
      "https://workw.com/realestate/aixco/broker-signup?lang=en",
    );
    expect(screen.getAllByRole("link", { name: "LOGIN" })[0]).toHaveAttribute(
      "href",
      "https://workw.com/realestate/aixco/broker-login?lang=en",
    );
  });

  it("renders the selected page from its shareable hash route", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /ACCESS → EARN → SELL → GROW/i })).toBeInTheDocument();
    expect(screen.getByText("90+")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "WHY AIXESS" }).filter((button) => button.getAttribute("aria-current") === "page")).toHaveLength(2);
  });

  it("navigates between pages without a full reload", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: "RESOURCES" })[0]);

    expect(window.location.hash).toBe("#resources");
    expect(screen.getByRole("heading", { name: /make the/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "RESOURCES" }).filter((button) => button.getAttribute("aria-current") === "page")).toHaveLength(2);
  });

  it("exposes calculators directly in the desktop and mobile navigation", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(screen.getAllByRole("button", { name: "CALCULATOR" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "CALCULATOR" })[0]);
    expect(window.location.hash).toBe("#calculators");
  });

  it("keeps resource CTAs connected to the working materials request dialog", () => {
    window.history.replaceState({}, "", "/#resources");
    render(<App />);

    const firstResource = screen.getAllByRole("article")[0];
    fireEvent.click(within(firstResource).getByRole("button", { name: /request pdf/i }));

    expect(screen.getByRole("dialog", { name: /request project materials/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /request project materials/i })).toBeInTheDocument();
  });

  it("shows the four document calculators and marks client PDF generation as future", () => {
    window.history.replaceState({}, "", "/#resources");
    render(<App />);

    expect(screen.getByText("CREATE CLIENT PDF")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /OPEN ALL CALCULATORS/i })).toHaveAttribute("href", "#calculators");
  });

  it("exposes the residence explorer as a dedicated destination", () => {
    window.history.replaceState({}, "", "/#residences");
    render(<App />);

    expect(screen.getByRole("heading", { name: /two buildings/i })).toBeInTheDocument();
    expect(screen.getByText(/official 3d reconstruction/i)).toBeInTheDocument();
  });

  it("switches the complete interface language and persists the selection", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: /change language: en/i })[0]);
    fireEvent.click(screen.getAllByRole("option", { name: /Deutsch/i })[0]);

    expect(document.documentElement.lang).toBe("de");
    expect(window.localStorage.getItem("aixess-language")).toBe("de");
    expect(screen.getAllByRole("button", { name: "WARUM AIXESS" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: /ZUGANG → VERDIENEN → VERKAUFEN → WACHSEN/i })).toBeInTheDocument();
  });
});
