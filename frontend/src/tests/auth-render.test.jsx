import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";
import AuthPage from "../pages/AuthPage";

describe("AuthPage — Login", () => {
  test("renderiza el formulario de login", () => {
    render(<AuthPage onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText("correo@ejemplo.com")).toBeInTheDocument();
  });

  test("renderiza el campo de contraseña", () => {
    render(<AuthPage onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  test("renderiza el tab de registro", () => {
    render(<AuthPage onLogin={vi.fn()} />);
    expect(screen.getByText("Registrarse")).toBeInTheDocument();
  });

  test("las fotos cambian solas cada tres segundos y conservan el correo y su foco", () => {
    vi.useFakeTimers();
    try {
      render(<AuthPage onLogin={vi.fn()} />);
      const panel = screen.getByRole("region", { name: "Del campo mexicano" });
      const carousel = within(panel);
      const email = screen.getByLabelText("Correo electrónico");
      email.focus();
      fireEvent.change(email, { target: { value: "ana@ejemplo.mx" } });
      fireEvent.pointerOver(panel, { pointerType: "mouse" });

      expect(carousel.queryByRole("button")).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(2999));
      expect(carousel.getByRole("heading", { name: "Sin maíz no hay país." })).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1));
      expect(carousel.getByRole("heading", { name: "El mango se antoja." })).toBeInTheDocument();
      expect(email).toHaveFocus();
      expect(email).toHaveValue("ana@ejemplo.mx");

      act(() => vi.advanceTimersByTime(18000));
      expect(carousel.getByRole("heading", { name: "Sin maíz no hay país." })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("AuthPage — Registro", () => {
  test.each([
    ["cliente", "Soy Cliente"],
    ["vendedor", "Soy Vendedor"],
  ])("el enlace de registro de %s abre el formulario con ese tipo de cuenta", (role, label) => {
    const previousUrl = window.location.href;
    try {
      window.history.replaceState(null, "", `/auth?registro=${role}`);
      render(<AuthPage onLogin={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
    } finally {
      window.history.replaceState(null, "", previousUrl);
    }
  });

  test("muestra campo de nombre al cambiar a registro", async () => {
    const user = userEvent.setup();
    render(<AuthPage onLogin={vi.fn()} />);
    await user.click(screen.getByText("Registrarse"));
    expect(screen.getByPlaceholderText("Ana García")).toBeInTheDocument();
  });

  test("muestra selector de rol al cambiar a registro", async () => {
    const user = userEvent.setup();
    render(<AuthPage onLogin={vi.fn()} />);
    await user.click(screen.getByText("Registrarse"));
    expect(screen.getByText("Soy Cliente")).toBeInTheDocument();
    expect(screen.getByText("Soy Vendedor")).toBeInTheDocument();
  });

  test("muestra el botón de crear cuenta", async () => {
    const user = userEvent.setup();
    render(<AuthPage onLogin={vi.fn()} />);
    await user.click(screen.getByText("Registrarse"));
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();
  });
});
