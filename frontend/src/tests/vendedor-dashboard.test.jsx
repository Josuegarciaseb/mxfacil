import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import VendedorDashboard from "../pages/vendor/Dashboard";


const USER_CON_PROVEEDOR    = { nombre: "Carlos Ruiz", proveedor_id: 5 };
const USER_SIN_PROVEEDOR_ID = { nombre: "Carlos Ruiz", proveedor_id: null };

const PRODUCTOS_MOCK = [{ id: 1 }, { id: 2 }];
const PEDIDOS_MOCK   = [
  { id: 20, usuario_nombre: "Sofía Torres", total: "900.00",  estado: "pendiente", fecha: "2025-01-15T10:00:00Z" },
  { id: 21, usuario_nombre: "Jorge Díaz",   total: "450.75",  estado: "enviado",   fecha: "2025-01-14T09:00:00Z" },
];

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes("/proveedores/me"))  return Promise.resolve({ ok: true, json: async () => ({ id: 5 }) });
    if (url.includes("/productos"))       return Promise.resolve({ ok: true, json: async () => PRODUCTOS_MOCK });
    if (url.includes("/pedidos"))         return Promise.resolve({ ok: true, json: async () => PEDIDOS_MOCK });
    return Promise.resolve({ ok: true, json: async () => [] });
  });
});

describe("VendedorDashboard — Renderizado", () => {
  test("muestra el título Mi Panel", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    expect(await screen.findByText("Mi Panel")).toBeInTheDocument();
  });

  test("muestra el saludo con el nombre del vendedor", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    expect(await screen.findByText(/Bienvenido, Carlos Ruiz/i)).toBeInTheDocument();
  });

  test("muestra las 3 tarjetas: Productos, Pedidos, Ingresos", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    expect(await screen.findByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
    expect(screen.getByText("Ingresos")).toBeInTheDocument();
  });

  test("muestra los conteos correctos en las tarjetas", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    await screen.findByText("Mi Panel");
    // 2 productos, 2 pedidos
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(2);
  });

  test("calcula y muestra los ingresos totales", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    await screen.findByText("Mi Panel");
    // 900 + 450.75 = 1350.75
    expect(document.body.textContent).toContain("1,350.75");
  });
});

describe("VendedorDashboard — Pedidos recientes", () => {
  test("muestra la sección de pedidos recientes", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    expect(await screen.findByText("Pedidos recientes")).toBeInTheDocument();
  });

  test("muestra los clientes en la tabla", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    expect(await screen.findByText("Sofía Torres")).toBeInTheDocument();
    expect(screen.getByText("Jorge Díaz")).toBeInTheDocument();
  });

  test("muestra EmptyState si no hay pedidos", async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/pedidos")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    expect(await screen.findByText("Sin pedidos")).toBeInTheDocument();
  });
});

describe("VendedorDashboard — Sin proveedor_id en user", () => {
  test("hace fetch a /proveedores/me si user.proveedor_id es null", async () => {
    render(<VendedorDashboard token="fake" user={USER_SIN_PROVEEDOR_ID} />);
    expect(await screen.findByText("Mi Panel")).toBeInTheDocument();
    const llamadas = global.fetch.mock.calls.map(([url]) => url);
    expect(llamadas.some((url) => url.includes("/proveedores/me"))).toBe(true);
  });
});