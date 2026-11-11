import { render, screen, within } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import VendedorDashboard from "../pages/vendor/Dashboard";


const USER_CON_PROVEEDOR    = { nombre: "Carlos Ruiz", proveedor_id: 5 };
const USER_SIN_PROVEEDOR_ID = { nombre: "Carlos Ruiz", proveedor_id: null };

const PRODUCTOS_MOCK = [{ id: 1 }, { id: 2 }];
const PEDIDOS_MOCK   = [
  { id: 20, usuario_nombre: "Sofía Torres", total: "414.12", importe_proveedor: "350.00", comision: "7.00", iva: "57.12", pago_estado: "pendiente", estado: "entregado", fecha: "2025-01-15T10:00:00Z" },
  { id: 21, usuario_nombre: "Jorge Díaz", total: "118.32", importe_proveedor: "100.00", comision: "2.00", iva: "16.32", pago_estado: "aprobado", estado: "enviado", fecha: "2025-01-14T09:00:00Z" },
];

beforeEach(() => {
  globalThis.fetch = vi.fn().mockImplementation((url) => {
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

  test("muestra conteos y un desglose del proveedor en pesos", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    expect(await screen.findByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", {name:"Comisión de plataforma"})).toBeInTheDocument();
  });

  test("muestra los conteos correctos en las tarjetas", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    await screen.findByText("Mi Panel");
    // 2 productos, 2 pedidos
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(2);
  });

  test("un pedido entregado contra entrega sigue por cobrar hasta confirmar el dinero", async () => {
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    await screen.findByText("Mi Panel");
    const pending = within(screen.getByRole("row", {name:/^Por cobrar/}));
    expect(pending.getByText("$414.12")).toBeInTheDocument();
    expect(pending.getByText("$350.00")).toBeInTheDocument();
    expect(pending.getByText("$7.00")).toBeInTheDocument();
    const paid = within(screen.getByRole("row", {name:/^Cobrado/}));
    expect(paid.getByText("$118.32")).toBeInTheDocument();
    expect(paid.queryByText("$414.12")).not.toBeInTheDocument();
  });

  test("separa el reembolso y la cancelación y marca los desgloses históricos desconocidos", async () => {
    const orders = [
      { ...PEDIDOS_MOCK[0], estado:"cancelado", pago_estado:"reembolsado" },
      { ...PEDIDOS_MOCK[1], estado:"cancelado", pago_estado:"rechazado", importe_proveedor:null, comision:null },
    ];
    globalThis.fetch = vi.fn(async url => ({ok:true,json:async () => url.includes("/pedidos") ? orders : []}));
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    await screen.findByText("Mi Panel");
    expect(within(screen.getByRole("row",{name:/^Reembolsado/})).getByText("$414.12")).toBeInTheDocument();
    expect(within(screen.getByRole("row",{name:/^Cancelado o rechazado/})).getAllByText("Sin desglose")).toHaveLength(2);
    expect(within(screen.getByRole("row",{name:/^Cobrado/})).getAllByText("$0.00")).toHaveLength(4);
  });

  test("un cobro tardío tiene saldo por devolver y comisión efectiva cero", async () => {
    const order = { ...PEDIDOS_MOCK[0], estado: "cancelado", pago_estado: "aprobado" };
    globalThis.fetch = vi.fn(async url => ({ok:true,json:async () => url.includes("/pedidos") ? [order] : []}));
    render(<VendedorDashboard token="fake" user={USER_CON_PROVEEDOR} />);
    const late = await screen.findByRole("row", {name:/^Cobro por devolver/});
    expect(within(late).getAllByRole("cell").map(cell => cell.textContent)).toEqual(["1", "—", "$0.00", "—", "$414.12"]);
    for (const name of [/^Cobrado/, /^Cancelado o rechazado/]) {
      expect(within(screen.getByRole("row", {name})).getAllByText("$0.00")).toHaveLength(4);
    }
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
    globalThis.fetch = vi.fn().mockImplementation((url) => {
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
    const llamadas = globalThis.fetch.mock.calls.map(([url]) => url);
    expect(llamadas.some((url) => url.includes("/proveedores/me"))).toBe(true);
  });
});
