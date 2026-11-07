import Icon from "../../components/ui/Icon";

const pesos = (value) => `$${value.toLocaleString("es-MX")} MXN`;

function FilterGroup({ title, children }) {
  return (
    <details className="catalog-filter-group" open>
      <summary>{title}<Icon name="chevronDown" size={15} /></summary>
      <div className="catalog-filter-options">{children}</div>
    </details>
  );
}

function FilterOption({ label, count, checked, onChange, status }) {
  return (
    <label className={`catalog-filter-option${checked ? " is-checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {status && <i className={`catalog-dot catalog-stock--${status}`} aria-hidden="true" />}
      <span>{label}{count !== undefined && <small>{`\u00a0(${count})`}</small>}</span>
    </label>
  );
}

function PriceRange({ limit, min, max, onMin, onMax }) {
  const step = limit <= 10 ? 0.01 : 1;
  function selectPrice(event) {
    if (!limit || event.target.tagName === "INPUT") return;
    const track = event.currentTarget.querySelector(".catalog-range-track").getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (event.clientX - track.left) / track.width));
    const price = Number((Math.round(position * limit / step) * step).toFixed(2));
    if (price < (min + max) / 2) onMin(price);
    else onMax(price);
  }
  return (
    <div className="catalog-price-range">
      <div className="catalog-range-sliders" onPointerDown={selectPrice} style={{
        "--range-start": `${limit ? 100 * min / limit : 0}%`,
        "--range-end": `${limit ? 100 * max / limit : 100}%`,
      }}>
        <div className="catalog-range-track" />
        <input type="range" aria-label="Precio mínimo" aria-valuetext={pesos(min)} step={step}
          min="0" max={limit || 1} value={min} disabled={!limit}
          style={{ zIndex: min === limit ? 2 : 0 }} onChange={(event) => onMin(Math.min(Number(event.target.value), max))} />
        <input type="range" aria-label="Precio máximo" aria-valuetext={pesos(max)} step={step}
          min="0" max={limit || 1} value={max} disabled={!limit}
          onChange={(event) => onMax(Math.max(Number(event.target.value), min))} />
      </div>
      <div className="catalog-range-values"><span>{pesos(min)}</span><span>{pesos(max)}</span></div>
    </div>
  );
}

export default function CatalogFilters({
  open, categories, categoryIds, onCategories, suppliers, supplierIds, onSupplier,
  statuses, statusCounts, selectedStatuses, onStatus, priceRange, activeCount, onReset,
}) {
  return (
    <aside id="catalog-filters" className={`catalog-filters${open ? " is-open" : ""}`} aria-label="Filtros del catálogo">
      <FilterGroup title="Categoría">
        <FilterOption label="Todos los productos" checked={!categoryIds.length} onChange={() => onCategories([])} />
        {categories.map(({ id, nombre }) => {
          const key = String(id);
          const checked = categoryIds.includes(key);
          return <FilterOption key={id} label={nombre} checked={checked}
            onChange={() => onCategories(checked ? categoryIds.filter((value) => value !== key) : [...categoryIds, key])} />;
        })}
      </FilterGroup>
      {suppliers.length > 0 && (
        <FilterGroup title="Proveedor">
          {suppliers.map(({ id, name, count }) => <FilterOption key={id} label={name} count={count}
            checked={supplierIds.includes(id)} onChange={() => onSupplier(id)} />)}
        </FilterGroup>
      )}
      <FilterGroup title="Disponibilidad">
        {statuses.map(({ id, label }) => <FilterOption key={id} status={id} label={label} count={statusCounts[id]}
          checked={selectedStatuses.includes(id)} onChange={() => onStatus(id)} />)}
      </FilterGroup>
      <FilterGroup title="Rango de precios"><PriceRange {...priceRange} /></FilterGroup>
      {activeCount > 0 && <button type="button" className="catalog-reset" onClick={onReset}>Limpiar filtros</button>}
    </aside>
  );
}
