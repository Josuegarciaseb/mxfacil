import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { http } from "../utils/api";

vi.mock("../utils/api", () => ({ http: vi.fn() }));

afterEach(() => {
  localStorage.clear();
  http.mockReset();
});

function openStore(path = "/catalogo") {
  localStorage.setItem("user", JSON.stringify({ id: 1, rol: "cliente", nombre: "Ana Torres" }));
  localStorage.setItem("token", "cliente-prueba");
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

it("descarta la selección al cerrar y conserva el destino confirmado al volver a la tienda", async () => {
  const addresses = [
    { id: 1, linea1: "Calle Flores 40", cp: "28000", ciudad: "Colima", estado: "Colima" },
    { id: 2, linea1: "Avenida Central 12", cp: "01234", ciudad: "Álvaro Obregón", estado: "Ciudad de México" },
  ];
  let principal = 1;
  http.mockImplementation(async (path, options) => {
    if (path === "/direcciones") return addresses.map(a => ({ ...a, es_principal: Number(a.id === principal) }));
    if (path === "/direcciones/2" && options.method === "PUT") {
      expect(JSON.parse(options.body)).toEqual({ es_principal: 1 });
      principal = 2;
      return { ...addresses[1], es_principal: 1 };
    }
    return [];
  });
  const store = openStore();
  const destination = await screen.findByRole("button", { name: /Enviar a Ana CP 28000/ });
  fireEvent.click(destination);
  fireEvent.click(screen.getByRole("radio", { name: /Avenida Central/ }));
  fireEvent.click(screen.getByRole("button", { name: "Cerrar", exact: true }));
  expect(principal).toBe(1);
  expect(destination).toHaveTextContent("CP 28000");

  fireEvent.click(destination);
  expect(screen.getByRole("radio", { name: /Calle Flores/ })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: /Avenida Central/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar", exact: true }));
  await waitFor(() => expect(destination).toHaveTextContent("CP 01234"));
  expect(screen.queryByRole("dialog")).toBeNull();

  store.unmount();
  openStore("/mis-direcciones");
  const picker = await screen.findByRole("dialog", { name: "Elige una dirección" });
  expect(await within(picker).findByRole("radio", { name: /Avenida Central/ })).toBeChecked();
});

it("recupera un error de carga y permite agregar la primera dirección sin perder el cero inicial del CP", async () => {
  let saved;
  let failLoad = true;
  http.mockImplementation(async (path, options) => {
    if (path !== "/direcciones") return [];
    if (failLoad) {
      failLoad = false;
      throw new Error("Sin conexión");
    }
    if (options.method === "POST") {
      saved = { ...JSON.parse(options.body), id: 8, es_principal: 0 };
      return saved;
    }
    return saved ? [saved] : [];
  });
  openStore("/mis-direcciones");
  fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Agregar nueva dirección" }));
  for (const [label, value] of Object.entries({
    "Calle y número": "Calle Roble 8", Ciudad: "Toluca", Estado: "México", "Código postal": "01234",
  })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByRole("radio", { name: /Calle Roble 8 CP 01234/ })).toBeChecked();
  expect(saved.cp).toBe("01234");
});
