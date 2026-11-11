import { featuredProducts, recordProEvent } from '../../utils/membresia';
import { useEffect, useMemo, useState } from "react";
import Icon from "../../components/ui/Icon";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import { http } from "../../utils/api";
import { gross, publicPrice } from "../../utils/cart";
import { toast } from "../../utils/toast";
import CatalogFilters from "./CatalogFilters";
import CatalogProduct from "./CatalogProduct";

const available = { id: "available", label: "Disponible" };
const low = { id: "low", label: "Pocas existencias" };
const soldOut = { id: "out", label: "Agotado" };
const statuses = [available, low, soldOut];
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const toggle = (values, value) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export default function ClientCatalogo({
  token, setCart, cart = [], onProductsFetched, externalSearch = "", onSearchChange,
  selectedCategories, onCategoriesChange,
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [localCategories, setLocalCategories] = useState([]);
  const [supplierIds, setSupplierIds] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("relevantes");
  const categoryIds = selectedCategories ?? localCategories;
  const setCategoryIds = onCategoriesChange ?? setLocalCategories;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [items, groups] = await Promise.all([http("/productos", {}, token), http("/categorias", {}, token)]);
        if (!active) return;
        setProducts(items);
        setCategories(groups);
        setLoadError(false);
        onProductsFetched?.(items);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token, onProductsFetched, attempt]);

  const entries = useMemo(() => products.map((product) => ({
    product,
    name: normalize(product.nombre),
    price: gross(publicPrice(product.precio)),
    status: product.stock > 5 ? available : product.stock > 0 ? low : soldOut,
    supplier: String(product.proveedor_id ?? product.proveedor_nombre ?? ""),
  })), [products]);
  const limit = Math.ceil(entries.reduce((highest, { price }) => Math.max(highest, price), 0));
  const max = Math.min(maxPrice ?? limit, limit);
  const min = Math.min(minPrice, max);
  const query = normalize(externalSearch);
  const activeCount = categoryIds.length + supplierIds.length + selectedStatuses.length + Number(min > 0 || max < limit);
  const suppliers = new Map();
  const statusCounts = { available: 0, low: 0, out: 0 };
  const matches = [];
  for (const entry of entries) {
    const { product, supplier, status, price, name } = entry;
    if (product.proveedor_nombre && !suppliers.has(supplier)) {
      suppliers.set(supplier, { id: supplier, name: product.proveedor_nombre, count: 0 });
    }
    if (!name.includes(query) || price < min || price > max) continue;
    if (categoryIds.length && !categoryIds.includes(String(product.categoria_id))) continue;
    const supplierMatches = !supplierIds.length || supplierIds.includes(supplier);
    const statusMatches = !selectedStatuses.length || selectedStatuses.includes(status.id);
    // Each group shows the counts available under all the other active filters.
    if (supplierMatches) statusCounts[status.id] += 1;
    if (statusMatches && suppliers.has(supplier)) suppliers.get(supplier).count += 1;
    if (supplierMatches && statusMatches) matches.push(entry);
  }
  if (sort === "menor") matches.sort((a, b) => a.price - b.price);
  if (sort === "mayor") matches.sort((a, b) => b.price - a.price);
  const featured = featuredProducts(matches);
  const cartQuantities = new Map(cart.map((item) => [item.id, item.qty]));
  const singleCategory = categoryIds.length === 1 && categories.find((item) => String(item.id) === categoryIds[0]);

  function resetFilters() {
    setCategoryIds([]);
    setSupplierIds([]);
    setSelectedStatuses([]);
    setMinPrice(0);
    setMaxPrice(null);
  }

  function addToCart(product, quantity) {
    if (quantity > product.stock - (cartQuantities.get(product.id) || 0)) {
      toast("Alcanzaste las existencias disponibles", "warn");
      return;
    }
    recordProEvent(product, "carrito");
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      const qty = Math.min((existing?.qty || 0) + quantity, product.stock);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, qty } : item);
      return [...current, { ...product, precio: publicPrice(product.precio), qty }];
    });
    toast(quantity === 1 ? `${product.nombre} agregado al carrito` : `${quantity} × ${product.nombre} en tu carrito`);
  }

  return (
    <div className="catalog-layout">
      <div className="catalog-banner"><p>Abastece tu negocio en un solo lugar</p></div>
      <div className="catalog-toolbar">
        <div>
          <h1 id="catalog-heading">{singleCategory?.nombre || "Catálogo"}</h1>
          {!loading && !loadError && <p className="catalog-count" aria-live="polite">
            {matches.length} {matches.length === 1 ? "producto encontrado" : "productos encontrados"}
            {query && ` para “${externalSearch.trim()}”`}
          </p>}
        </div>
        <div className="catalog-controls">
          <button type="button" className="catalog-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="sliders" size={15} />Filtros{activeCount > 0 && ` (${activeCount})`}</button>
          <label className="catalog-sort">
            <span>Ordenar por</span>
            <select aria-label="Ordenar productos" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="relevantes">Más relevantes</option>
              <option value="menor">Menor precio</option>
              <option value="mayor">Mayor precio</option>
            </select>
            <Icon name="chevronDown" size={15} />
          </label>
          <div className="catalog-view" role="group" aria-label="Vista del catálogo">
            {["grid", "list"].map((mode) => <button type="button" key={mode} aria-pressed={view === mode}
              aria-label={mode === "grid" ? "Vista de cuadrícula" : "Vista de lista"} onClick={() => setView(mode)}>
              <Icon name={mode} size={17} />
            </button>)}
          </div>
        </div>
      </div>

      <CatalogFilters open={filtersOpen} categories={categories} categoryIds={categoryIds} onCategories={setCategoryIds}
        suppliers={[...suppliers.values()].sort((a, b) => a.name.localeCompare(b.name, "es-MX"))}
        supplierIds={supplierIds} onSupplier={(id) => setSupplierIds((current) => toggle(current, id))}
        statuses={statuses} statusCounts={statusCounts} selectedStatuses={selectedStatuses}
        onStatus={(id) => setSelectedStatuses((current) => toggle(current, id))}
        priceRange={{ limit, min, max, onMin: setMinPrice, onMax: (value) => setMaxPrice(value === limit ? null : value) }}
        activeCount={activeCount} onReset={resetFilters} />

      <section className="catalog-results" aria-labelledby="catalog-heading" aria-busy={loading}>
        {loading ? <div role="status" aria-label="Cargando catálogo"><Spinner /></div> : loadError ? (
          <div className="catalog-error" role="alert">No se pudo cargar el catálogo.
            <button type="button" className="btn-secondary" onClick={() => { setLoading(true); setAttempt((count) => count + 1); }}>Reintentar</button>
          </div>
        ) : !matches.length ? (
          <EmptyState icon="search" title={products.length ? "Sin resultados" : "Aún no hay productos"}
            sub={products.length ? "Prueba con otra búsqueda o ajusta los filtros." : "Los productos publicados aparecerán aquí."}
            action={(activeCount > 0 || (query && onSearchChange)) &&
              <button className="btn-secondary" onClick={() => { resetFilters(); onSearchChange?.(""); }}>Ver todos los productos</button>} />
        ) : (
          <>
          {featured.length > 0 && <section className="catalog-pro-promo" aria-label="Productos promocionados">
            <h2>Descubre proveedores Pro</h2><p>Promocionado · Selección rotativa, un producto por proveedor. Coincide con tus filtros.</p>
            <div className="catalog-products catalog-products--grid">{featured.map(({product,price,status}) => <CatalogProduct key={product.id} product={product} price={price} status={status} inCart={cartQuantities.get(product.id) || 0} onAdd={addToCart} promoted />)}</div>
          </section>}
          <div className={`catalog-products catalog-products--${view}`}>
            {matches.map(({ product, price, status }, index) => <CatalogProduct key={product.id} product={product}
              price={price} status={status} eager={index < 4} inCart={cartQuantities.get(product.id) || 0} onAdd={addToCart} />)}
          </div>
          </>
        )}
      </section>
    </div>
  );
}
