import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import VendedorDashboard from "../pages/vendor/Dashboard";


function abrir(seccion="resumen") {
  return render(<MemoryRouter><VendedorDashboard token="fake" perfil="/proveedores/5" cantidad={2} seccion={seccion}/></MemoryRouter>);
}

const PEDIDOS_MOCK   = [
  { id: 20, usuario_nombre: "Sofía Torres", total: "414.12", importe_proveedor: "350.00", comision: "7.00", iva: "57.12", pago_estado: "pendiente", estado: "entregado", fecha: "2025-01-15T10:00:00Z" },
  { id: 21, usuario_nombre: "Jorge Díaz", total: "118.32", importe_proveedor: "100.00", comision: "2.00", iva: "16.32", pago_estado: "aprobado", estado: "enviado", fecha: "2025-01-14T09:00:00Z" },
];

beforeEach(() => {
  globalThis.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes("/pedidos"))         return Promise.resolve({ ok: true, json: async () => PEDIDOS_MOCK });
    return Promise.resolve({ ok: true, json: async () => [] });
  });
});

describe("VendedorDashboard — Renderizado", () => {
  test("enlaza el perfil público y filtra únicamente las ventas en tránsito", async () => {
    abrir();
    expect(await screen.findByRole("link",{name:"Ver mi perfil público"})).toHaveAttribute("href","/proveedores/5");
    expect(screen.getByText("2 productos en tu inventario")).toBeVisible();
    fireEvent.click(screen.getByRole("button",{name:"En tránsito 1"}));
    expect(screen.getByText("Jorge Díaz")).toBeVisible();
    expect(screen.queryByText("Sofía Torres")).not.toBeInTheDocument();
  });

  test("un pedido entregado contra entrega sigue por cobrar hasta confirmar el dinero", async () => {
    abrir("cobros");
    await screen.findByRole("heading",{name:"Cobros de tus productos"});
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
    abrir("cobros");
    await screen.findByRole("heading",{name:"Cobros de tus productos"});
    expect(within(screen.getByRole("row",{name:/^Reembolsado/})).getByText("$414.12")).toBeInTheDocument();
    expect(within(screen.getByRole("row",{name:/^Cancelado o rechazado/})).getAllByText("Sin desglose")).toHaveLength(2);
    expect(within(screen.getByRole("row",{name:/^Cobrado/})).getAllByText("$0.00")).toHaveLength(4);
  });

  test("un cobro tardío tiene saldo por devolver y comisión efectiva cero", async () => {
    const order = { ...PEDIDOS_MOCK[0], estado: "cancelado", pago_estado: "aprobado" };
    globalThis.fetch = vi.fn(async url => ({ok:true,json:async () => url.includes("/pedidos") ? [order] : []}));
    abrir("cobros");
    const late = await screen.findByRole("row", {name:/^Cobro por devolver/});
    expect(within(late).getAllByRole("cell").map(cell => cell.textContent)).toEqual(["1", "—", "$0.00", "—", "$414.12"]);
    for (const name of [/^Cobrado/, /^Cancelado o rechazado/]) {
      expect(within(screen.getByRole("row", {name})).getAllByText("$0.00")).toHaveLength(4);
    }
  });
});

describe("VendedorDashboard — Pedidos recientes", () => {
  test("muestra la sección de pedidos recientes", async () => {
    abrir();
    expect(await screen.findByText("Actividad de ventas")).toBeInTheDocument();
  });

  test("muestra los clientes en la tabla", async () => {
    abrir();
    expect(await screen.findByText("Sofía Torres")).toBeInTheDocument();
    expect(screen.getByText("Jorge Díaz")).toBeInTheDocument();
  });

  test("muestra EmptyState si no hay pedidos", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/pedidos")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    abrir();
    expect(await screen.findByText("Sin pedidos")).toBeInTheDocument();
  });
});
