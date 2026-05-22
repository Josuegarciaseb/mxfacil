import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

describe("PageHeader", () => {
  test("renderiza el título correctamente", () => {
    render(<PageHeader title="Productos" />);
    expect(screen.getByRole("heading", { name: "Productos" })).toBeInTheDocument();
  });

  test("renderiza el subtítulo cuando se pasa", () => {
    render(<PageHeader title="Productos" subtitle="12 registros" />);
    expect(screen.getByText("12 registros")).toBeInTheDocument();
  });

  test("no renderiza subtítulo si no se pasa", () => {
    render(<PageHeader title="Productos" />);
    expect(screen.queryByText("12 registros")).not.toBeInTheDocument();
  });

  test("renderiza el botón de acción", () => {
    render(<PageHeader title="Productos" actions={<button>Nuevo</button>} />);
    expect(screen.getByRole("button", { name: "Nuevo" })).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  test("renderiza el título", () => {
    render(<EmptyState icon="cart" title="Sin pedidos" sub="Haz tu primera compra" />);
    expect(screen.getByText("Sin pedidos")).toBeInTheDocument();
  });

  test("renderiza el subtítulo", () => {
    render(<EmptyState icon="cart" title="Sin pedidos" sub="Haz tu primera compra" />);
    expect(screen.getByText("Haz tu primera compra")).toBeInTheDocument();
  });

  test("renderiza el botón de acción si se pasa", () => {
    render(
      <EmptyState icon="cart" title="Vacío" sub="" action={<button>Agregar</button>} />
    );
    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
  });
});