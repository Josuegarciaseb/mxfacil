import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";
import StatusBadge from "../components/ui/StatusBadge";
import Btn from "../components/ui/Btn";

describe("StatusBadge", () => {
  test("muestra 'Pendiente' para estado pendiente", () => {
    render(<StatusBadge estado="pendiente" />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  test("muestra 'Entregado' para estado entregado", () => {
    render(<StatusBadge estado="entregado" />);
    expect(screen.getByText("Entregado")).toBeInTheDocument();
  });

  test("muestra 'Cancelado' para estado cancelado", () => {
    render(<StatusBadge estado="cancelado" />);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });
});

describe("Btn", () => {
  test("renderiza el texto correctamente", () => {
    render(<Btn>Guardar</Btn>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  test("llama a onClick al hacer clic", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Btn onClick={handleClick}>Click</Btn>);
    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("está deshabilitado cuando disabled=true", () => {
    render(<Btn disabled>Disabled</Btn>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});