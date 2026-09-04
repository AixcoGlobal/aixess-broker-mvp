import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { LanguageProvider } from "../i18n.jsx";
import { consentChoice } from "../analytics.js";
import { PrivacyControls } from "./Privacy.jsx";
const styles = readFileSync("src/components/privacy.css", "utf8");

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
function mount() { return render(<LanguageProvider><style>{styles}</style><PrivacyControls page="home" /></LanguageProvider>); }

it("centers the notice on both axes and keeps short-screen overflow accessible", () => {
  mount();
  const style = getComputedStyle(screen.getByRole("region", { name: "Your privacy, your choice." }));
  expect(style.position).toBe("fixed");
  expect(style.top).toBe("50%");
  expect(style.left).toBe("50%");
  expect(style.transform).toMatch(/translate\(-50%,\s*-50%\)/);
  expect(style.maxHeight).toBe("calc(100dvh - 32px)");
  expect(style.overflow).toBe("auto");
});

it.each([["Reject analytics", "rejected"], ["Accept analytics", "accepted"]])("preserves %s and reopening settings", (button, choice) => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: button }));
  expect(consentChoice()).toBe(choice);
  expect(screen.queryByRole("region", { name: "Your privacy, your choice." })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
  expect(screen.getByRole("region", { name: "Your privacy, your choice." })).toBeVisible();
});
