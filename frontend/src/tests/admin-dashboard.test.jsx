import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import AdminDashboard from "../pages/admin/Dashboard";

const PRODUCTOS_MOCK  = [{ id: 1 }, { id: 2 }, { id: 3 }];
const PEDIDOS_MOCK    = [
  { id: 10, usuario_nombre: "Ana García",  total: "1500.00", estado: "pendiente",   fecha: "2025-01-15T10:00:00Z" },
  { id: 11, usuario_nombre: "Luis Pérez",  total: "320.50",  estado: "enviado",     fecha: "2025-01-14T09:00:00Z" },
  { id: 12, usuario_nombre: "María López", total: "780.00",  estado: "entregado",   fecha: "2025-01-13T08:00:00Z" },
];
const USUARIOS_MOCK   = [{ id: 1 }, { id: 2 }];
const PROVEEDORES_MOCK = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes("/productos"))    return Promise.resolve({ ok: true, json: async () => PRODUCTOS_MOCK });
    if (url.includes("/pedidos"))      return Promise.resolve({ ok: true, json: async () => PEDIDOS_MOCK });
    if (url.includes("/usuario"))      return Promise.resolve({ ok: true, json: async () => USUARIOS_MOCK });
    if (url.includes("/proveedores"))  return Promise.resolve({ ok: true, json: async () => PROVEEDORES_MOCK });
    return Promise.resolve({ ok: true, json: async () => [] });
  });
});

describe("AdminDashboard — Renderizado", () => {
  test("muestra el título Panel de Control", async () => {
    render(<AdminDashboard token="fake" />);
    expect(await screen.findByText("Panel de Control")).toBeInTheDocument();
  });

  test("muestra las 4 tarjetas de estadísticas", async () => {
    render(<AdminDashboard token="fake" />);
    expect(await screen.findByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
  });

  test("muestra los conteos correctos en las tarjetas", async () => {
  render(<AdminDashboard token="fake" />);
  await screen.findByText("Panel de Control");

  // Buscar cada stat dentro de su tarjeta usando getAllByText
  // 3 productos, 3 pedidos → ambos muestran "3"
  const treses = screen.getAllByText("3");
  expect(treses.length).toBeGreaterThanOrEqual(2); // productos y pedidos
  expect(screen.getByText("2")).toBeInTheDocument();

  expect(screen.getByText("4")).toBeInTheDocument();
});
});

describe("AdminDashboard — Pedidos recientes", () => {
  test("muestra la sección de pedidos recientes", async () => {
    render(<AdminDashboard token="fake" />);
    expect(await screen.findByText("Pedidos recientes")).toBeInTheDocument();
  });

  test("muestra los clientes de los pedidos recientes", async () => {
    render(<AdminDashboard token="fake" />);
    expect(await screen.findByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
  });

  test("muestra los IDs de pedido con #", async () => {
    render(<AdminDashboard token="fake" />);
    expect(await screen.findByText("#10")).toBeInTheDocument();
    expect(screen.getByText("#11")).toBeInTheDocument();
  });

  test("muestra EmptyState si no hay pedidos", async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/pedidos")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    render(<AdminDashboard token="fake" />);
    expect(await screen.findByText("Sin pedidos")).toBeInTheDocument();
  });
});