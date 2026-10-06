import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { NETWORK_COPY } from "./network-copy";
import { HOME_HERO_LINES } from "./project-showcase-copy";
import { LASHA_HOME_COPY } from "./lasha-home-copy";

beforeEach(() => {
  window.history.replaceState({}, "", "/#why-aixess");
  window.scrollTo = () => {};
  window.localStorage.removeItem("aixess-language");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("AIXESS navigation pages", () => {
  it("keeps the primary menu in the approved order", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(Array.from(document.querySelectorAll(".desktop-nav button")).map((button) => button.textContent)).toEqual([
      "AIXESS ADVANTAGE",
      "BROKER ACCESS",
      "SELECTED OPPORTUNITIES",
      "INSIGHTS",
      "BROKER TOOLS",
    ]);
  });

  it("puts the newer first-page brief on the homepage while retaining the existing structure", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DESIGNED FOR VALUEBUILT FOR TOMORROW");
    expect(container.querySelector(".lasha-hero-copy")).toContainElement(screen.getByRole("img", { name: "AIXESS" }));
    expect(screen.getByText(LASHA_HOME_COPY.en.heroSubtitle.replace(/\s+/g, " "))).toBeInTheDocument();
    expect(screen.getByText(LASHA_HOME_COPY.en.aboutBody)).toBeInTheDocument();
    expect(screen.getByText(NETWORK_COPY.en.introTagline.replace(/\.$/, ""))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DIFFERENT STARTING POINTS. ONE PLATFORM TO MOVE FORWARD" })).toBeInTheDocument();
    expect(container.querySelector(".lasha-access")).toBeInTheDocument();
    expect(container.querySelector(".project-ticker")).not.toBeInTheDocument();
    expect(container.querySelector("[data-content-section]")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "BROKER ACCESS" })[0]);
    expect(container.querySelector('[data-content-section="eligibility"]')).toBeInTheDocument();
    expect(container.querySelector('[data-content-section="introduction"]')).not.toBeInTheDocument();
    expect(screen.getByText("COMING SOON")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "REQUEST ACCESS" })[0]).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-signup?lang=en");
    expect(screen.getAllByRole("link", { name: "PARTNER SIGN IN" })[0]).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-login?lang=en");
    fireEvent.click(screen.getAllByRole("button", { name: "INSIGHTS" })[0]);
    expect(screen.getAllByRole("button", { name: /REQUEST PDF/i })).toHaveLength(3);
  });

  it.each(Object.keys(NETWORK_COPY))("renders the complete first-page brief in %s", (locale) => {
    window.history.replaceState({}, "", "/");
    localStorage.setItem("aixess-language", locale);
    const { container } = render(<App />);
    const c = NETWORK_COPY[locale];
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HOME_HERO_LINES[locale].join(""));
    const l = LASHA_HOME_COPY[locale];
    expect(screen.getByRole("heading", { name: l.projectTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: l.aboutTitle.join("") })).toBeInTheDocument();
    expect(screen.getByText(l.heroSubtitle.replace(/\s+/g, " "))).toBeInTheDocument();
    expect(container.querySelectorAll(".lasha-starting-grid article")).toHaveLength(3);
    expect(container.querySelectorAll(".lasha-metrics > div")).toHaveLength(3);
    for (const [title] of c.startingPoints) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    // Lasha's frame repeats the first card's line under all three starting points.
    expect(screen.getAllByText(c.startingPoints[0][1])).toHaveLength(3);
  });

  it("shows Reverance as the featured homepage project with working project actions", () => {
    window.history.replaceState({}, "", "/");
    const scrollIntoView = vi.fn();
    const explorer = document.createElement("section");
    explorer.id = "residences";
    explorer.scrollIntoView = scrollIntoView;
    document.body.appendChild(explorer);
    const { container } = render(<App />);
    const showcase = container.querySelector("#projects");
    expect(within(showcase).getByRole("heading", { name: "CURRENT PROJECT IN BATUMI" })).toBeInTheDocument();
    expect(within(showcase).getByText("€45K")).toBeInTheDocument();
    expect(within(showcase).getByText("Entry from €45,000")).toBeInTheDocument();
    expect(screen.getByText(String(163))).toBeInTheDocument();
    expect(showcase.querySelector(".project-upcoming")).not.toBeInTheDocument();
    const thumbs = within(showcase).getAllByRole("button", { name: /Show Reverance image/ });
    fireEvent.click(thumbs[1]);
    expect(thumbs[1]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(showcase).getByRole("button", { name: /EXPLORE PROJECT/ }));
    expect(scrollIntoView).toHaveBeenCalled();
    fireEvent.click(within(showcase).getByRole("button", { name: /CALCULATOR/ }));
    expect(screen.getAllByRole("button", { name: "BROKER TOOLS" }).filter((button) => button.getAttribute("aria-current") === "page").length).toBeGreaterThan(0);
    explorer.remove();
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

  it("puts the supplied first-page copy on AiXESS Advantage and Broker Access corrections on Broker Access", () => {
    window.history.replaceState({}, "", "/#why-aixess");
    render(<App />);

    expect(screen.getByRole("heading", { name: "TURN YOUR NETWORK INTO OPPORTUNITY." })).toBeInTheDocument();
    expect(screen.getByText("AiXESS expands what you can offer your clients and connections — giving you access to selected international real estate opportunities, professional tools, ready-to-sell materials and direct AIXCO support.")).toBeInTheDocument();
    expect(screen.getByText("YOUR CONNECTIONS. YOUR AMBITION. YOUR NEXT OPPORTUNITY.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DIFFERENT STARTING POINTS. ONE PLATFORM TO MOVE FORWARD." })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "BROKER ACCESS" })[0]);
    expect(screen.getByText("ASPIRING PROFESSIONALS")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "10% DOWN PAYMENT. 100% COMMISSION UNLOCKED." })).toBeInTheDocument();
    expect(screen.getByText("Your client secures the property with just 10% down payment, unlocking your full commission, paid within 72 hours.")).toBeInTheDocument();
  });

  it("renders the selected page from its shareable hash route", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /ACCESS → EARN → SELL → GROW/i })).toBeInTheDocument();
    expect(screen.getByText("90+")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "AIXESS ADVANTAGE" }).filter((button) => button.getAttribute("aria-current") === "page")).toHaveLength(2);
  });

  it("navigates between pages without a full reload", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: "INSIGHTS" })[0]);

    expect(window.location.hash).toBe("#insights");
    expect(screen.getByRole("heading", { name: /make the/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "INSIGHTS" }).filter((button) => button.getAttribute("aria-current") === "page")).toHaveLength(2);
  });

  it("exposes broker tools directly in the desktop and mobile navigation", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(screen.getAllByRole("button", { name: "BROKER TOOLS" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "BROKER TOOLS" })[0]);
    expect(window.location.hash).toBe("#broker-tools");
    expect(await screen.findByRole("tablist")).toBeInTheDocument();
  });

  it("keeps resource CTAs connected to the working materials request dialog", () => {
    window.history.replaceState({}, "", "/#insights");
    render(<App />);

    const firstResource = screen.getAllByRole("article")[0];
    fireEvent.click(within(firstResource).getByRole("button", { name: /request pdf/i }));

    expect(screen.getByRole("dialog", { name: /request project materials/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /request project materials/i })).toBeInTheDocument();
  });

  it("shows the four document calculators and client PDF generation", async () => {
    window.history.replaceState({}, "", "/#broker-tools");
    render(<App />);

    expect(await screen.findByText("CREATE CLIENT PDF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CREATE CLIENT PDF" })).toBeDisabled();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders the admin route through its lazy boundary without throwing", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/admin/session")) {
        return new Response(JSON.stringify({ error: "Sign in" }), { status: 401, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ setupAvailable: false }), { status: 200, headers: { "content-type": "application/json" } });
    });

    try {
      window.history.replaceState({}, "", "/#admin");
      render(<App />);
      expect(await screen.findByRole("heading", { name: "Welcome back." })).toBeInTheDocument();
    } finally {
      fetchMock.mockRestore();
    }
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
    expect(screen.getAllByRole("button", { name: "AIXESS-VORTEIL" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: /ZUGANG → VERDIENEN → VERKAUFEN → WACHSEN/i })).toBeInTheDocument();
  });
});
