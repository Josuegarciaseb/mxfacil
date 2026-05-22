import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import ClientCatalogo from "../pages/client/Catalogo";

const PRODUCTOS_MOCK = [
  { id: 1, nombre: "Caja de mangos",  precio: 350, categoria_id: 1, categoria_nombre: "Frutas y verduras",  proveedor_nombre: "Proveedor A", stock: 20, activo: 1 },
  { id: 2, nombre: "Saco de arroz",   precio: 120, categoria_id: 6, categoria_nombre: "Granos y legumbres", proveedor_nombre: "Proveedor B", stock: 50, activo: 1 },
  { id: 3, nombre: "Aceite vegetal",  precio: 45,  categoria_id: 7, categoria_nombre: "Aceites y grasas",   proveedor_nombre: "Proveedor C", stock: 0,  activo: 1 },
];

const CATEGORIAS_MOCK = [
  { id: 1, nombre: "Frutas y verduras" },
  { id: 6, nombre: "Granos y legumbres" },
  { id: 7, nombre: "Aceites y grasas" },
];

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes("/categorias"))
      return Promise.resolve({ ok: true, json: async () => CATEGORIAS_MOCK });
    return Promise.resolve({ ok: true, json: async () => PRODUCTOS_MOCK });
  });
});

// Props base para modo con búsqueda externa
const baseProps = {
  token: "fake",
  setCart: vi.fn(),
  externalSearch: "",
  externalCatFilter: "",
  onCatFilter: vi.fn(),
};

describe("Catalogo — Renderizado", () => {
  test("muestra los productos cargados", async () => {
    render(<ClientCatalogo token="fake" setCart={vi.fn()} />);
    expect(await screen.findByText("Caja de mangos")).toBeInTheDocument();
    expect(await screen.findByText("Saco de arroz")).toBeInTheDocument();
  });

  test("muestra la etiqueta MAYOREO en los productos", async () => {
    render(<ClientCatalogo token="fake" setCart={vi.fn()} />);
    const etiquetas = await screen.findAllByText("MAYOREO");
    expect(etiquetas.length).toBeGreaterThan(0);
  });

  test("muestra el badge Agotado en productos sin stock", async () => {
  render(<ClientCatalogo token="fake" setCart={vi.fn()} />);
  await screen.findByText("Caja de mangos");
  expect(screen.getByText("Agotado")).toBeInTheDocument();
});
});


describe("Catalogo — Búsqueda", () => {
  test("filtra productos al recibir externalSearch", async () => {
    const { rerender } = render(<ClientCatalogo {...baseProps} />);
    await screen.findByText("Caja de mangos");

    rerender(<ClientCatalogo {...baseProps} externalSearch="arroz" />);

    expect(screen.getByText("Saco de arroz")).toBeInTheDocument();
    expect(screen.queryByText("Caja de mangos")).not.toBeInTheDocument();
  });

  test("muestra 0 resultados si no hay coincidencias", async () => {
    const { rerender } = render(<ClientCatalogo {...baseProps} />);
    await screen.findByText("Caja de mangos");

    rerender(<ClientCatalogo {...baseProps} externalSearch="producto_inexistente" />);

    expect(screen.getByText(/0 resultados/i)).toBeInTheDocument();
  });

  test("llama a setCart al agregar un producto", async () => {
    const user = userEvent.setup();
    const setCart = vi.fn();
    render(<ClientCatalogo token="fake" setCart={setCart} />);
    await screen.findByText("Caja de mangos");

    const botones = screen.getAllByRole("button", { name: /agregar/i });
    await user.click(botones[0]);

    expect(setCart).toHaveBeenCalled();
  });
});