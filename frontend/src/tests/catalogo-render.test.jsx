import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import ClientCatalogo from "../pages/client/Catalogo";

const PRODUCTOS_MOCK = [
  { id: 1, nombre: "Caja de mangos",  precio: 350, categoria_id: 1, categoria_nombre: "Frutas y verduras",  proveedor_nombre: "Proveedor A", stock: 20, activo: 1 },
  { id: 2, nombre: "Saco de arroz",   precio: 120, categoria_id: 6, categoria_nombre: "Granos y legumbres", proveedor_nombre: "Proveedor B", stock: 50, activo: 1 },
  { id: 3, nombre: "Semilla de calabaza", precio: 45, categoria_id: 13, categoria_nombre: "Semillas",       proveedor_nombre: "Proveedor C", stock: 0,  activo: 1 },
  { id: 4, nombre: "Frijol pinto", precio: 80, categoria_id: 6, categoria_nombre: "Granos y legumbres", proveedor_nombre: "Proveedor B", stock: 3, activo: 1 },
];

const CATEGORIAS_MOCK = [
  { id: 1, nombre: "Frutas y verduras" },
  { id: 6, nombre: "Granos y legumbres" },
  { id: 13, nombre: "Semillas" },
];

beforeEach(() => {
  globalThis.fetch = vi.fn().mockImplementation((url) => {
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
};

describe("Catalogo — Renderizado", () => {
  test("muestra los productos cargados", async () => {
    render(<ClientCatalogo token="fake" setCart={vi.fn()} />);
    expect(await screen.findByText("Caja de mangos")).toBeInTheDocument();
    expect(await screen.findByText("Saco de arroz")).toBeInTheDocument();
  });

  test("muestra la disponibilidad real de cada producto", async () => {
    render(<ClientCatalogo token="fake" setCart={vi.fn()} />);
    const mangos = await screen.findByRole("article", { name: "Caja de mangos" });
    expect(within(mangos).getByText("Disponible")).toBeInTheDocument();
    const frijol = screen.getByRole("article", { name: "Frijol pinto" });
    expect(within(frijol).getByText("Pocas existencias")).toBeInTheDocument();
  });

  test("muestra el badge Agotado en productos sin stock", async () => {
    render(<ClientCatalogo token="fake" setCart={vi.fn()} />);
    const product = await screen.findByRole("article", { name: "Semilla de calabaza" });
    expect(within(product).getByText("Agotado")).toBeInTheDocument();
    expect(within(product).getByRole("button", { name: /agregar/i })).toBeDisabled();
  });
});


describe("Catalogo — Búsqueda", () => {
  test("filtra las semillas por el ID recibido de la API", async () => {
    render(<ClientCatalogo {...baseProps} selectedCategories={["13"]} />);
    expect(await screen.findByText("Semilla de calabaza")).toBeInTheDocument();
    expect(screen.getByRole("heading", {name:"Semillas"})).toBeInTheDocument();
    expect(screen.queryByText("Caja de mangos")).not.toBeInTheDocument();
  });

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

    expect(screen.getByText(/0 productos encontrados/i)).toBeInTheDocument();
  });

  test("agrega la cantidad seleccionada y respeta lo que ya hay en el carrito", async () => {
    const user = userEvent.setup();
    const setCart = vi.fn();
    render(<ClientCatalogo token="fake" setCart={setCart} cart={[{ id: 1, qty: 18 }]} />);
    const product = await screen.findByRole("article", { name: "Caja de mangos" });
    const quantity = within(product).getByRole("spinbutton");
    fireEvent.change(quantity, { target: { value: "50" } });
    expect(quantity).toHaveValue(2);
    fireEvent.change(quantity, { target: { value: "1" } });
    const more = within(product).getByRole("button", { name: /sumar/i });
    await user.click(more);
    expect(more).toBeDisabled();
    await user.click(within(product).getByRole("button", { name: /agregar/i }));
    const update = setCart.mock.lastCall[0];
    expect(update([{ id: 1, qty: 18 }])[0].qty).toBe(20);
    expect(update([{ id: 1, qty: 19 }])[0].qty).toBe(20);
    expect(update([])[0]).toMatchObject({ id: 1, qty: 2, precio: 357 });
  });

  test("combina categorías, proveedor y existencias, y permite limpiar la selección", async () => {
    const user = userEvent.setup();
    render(<ClientCatalogo {...baseProps} />);
    await screen.findByRole("article", { name: "Caja de mangos" });
    await user.click(screen.getByRole("checkbox", { name: "Frutas y verduras" }));
    await user.click(screen.getByRole("checkbox", { name: "Granos y legumbres" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    await user.click(screen.getByRole("checkbox", { name: /Proveedor B/ }));
    await user.click(screen.getByRole("checkbox", { name: /Pocas existencias/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("article", { name: "Frijol pinto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  test("el rango y el orden usan el precio exhibido con IVA en ambas vistas", async () => {
    const user = userEvent.setup();
    render(<ClientCatalogo {...baseProps} />);
    await screen.findByRole("article", { name: "Caja de mangos" });
    fireEvent.change(screen.getByRole("slider", { name: "Precio máximo" }), { target: { value: "130" } });
    expect(screen.queryByRole("article", { name: "Saco de arroz" })).toBeNull();
    await user.selectOptions(screen.getByLabelText("Ordenar productos"), "mayor");
    await user.click(screen.getByRole("button", { name: "Vista de lista" }));
    expect(screen.getAllByRole("article")[0]).toHaveAccessibleName("Frijol pinto");
    fireEvent.change(screen.getByRole("slider", { name: "Precio mínimo" }), { target: { value: "70" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});
