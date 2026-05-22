import { render, screen } from "@testing-library/react";
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
});

describe("AuthPage — Registro", () => {
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