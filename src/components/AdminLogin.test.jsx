import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminLogin from "./AdminLogin.jsx";

const result = (body, ok = true) => ({ ok, headers: new Headers({ "content-type": "application/json" }), json: async () => body });
beforeEach(() => { window.location.hash = "admin"; vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

it("requires a successful password response before opening the dashboard", async () => {
  fetch.mockResolvedValueOnce(result({ setupAvailable: false })).mockResolvedValueOnce(result({ error: "Email or password is incorrect." }, false)).mockResolvedValueOnce(result({ signedIn: true }));
  const signedIn = vi.fn(); render(<AdminLogin onSignedIn={signedIn} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Sign in →" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "qa@example.test" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "A testing passphrase" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in →" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
  expect(signedIn).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Sign in →" }));
  await waitFor(() => expect(signedIn).toHaveBeenCalledOnce());
});

it("removes setup keys from the URL and requires recovery-code acknowledgement", async () => {
  window.location.hash = "admin?setup=private-test-key";
  fetch.mockResolvedValueOnce(result({ setupAvailable: true, email: "qa@example.test" })).mockResolvedValueOnce(result({ email: "qa@example.test", recoveryCode: "a".repeat(64) }));
  const signedIn = vi.fn(); render(<AdminLogin onSignedIn={signedIn} />);
  await screen.findByRole("heading", { name: "Create your admin password." });
  expect(window.location.hash).toBe("#admin");
  expect(fetch.mock.calls[0][1].headers["x-aixess-setup-key"]).toBe("private-test-key");
  expect(screen.getByLabelText("Email address")).toHaveAttribute("readonly");
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "A testing passphrase" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Does not match" } });
  fireEvent.submit(screen.getByRole("button", { name: "Create admin account →" }).closest("form"));
  expect(screen.getByRole("alert")).toHaveTextContent("The passwords do not match.");
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "A testing passphrase" } });
  fireEvent.submit(screen.getByRole("button", { name: "Create admin account →" }).closest("form"));
  await screen.findByRole("heading", { name: "Save your recovery code." });
  expect(signedIn).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Continue to login →" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Continue to login →" }));
  expect(screen.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("");
});

it("provides recovery-code reset without claiming to send an email", async () => {
  fetch.mockResolvedValueOnce(result({ setupAvailable: false }));
  render(<AdminLogin onSignedIn={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Sign in →" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
  expect(screen.getByLabelText("Recovery code")).toBeRequired();
  expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
  fireEvent.click(screen.getByRole("button", { name: "Back to login" }));
  expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
});
