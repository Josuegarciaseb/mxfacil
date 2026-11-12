import { InputField } from "../ui/FormFields";

export default function AddressFields({ value, onChange }) {
  function field(name) {
    return {
      value: value[name],
      onChange: event => onChange({ ...value, [name]: event.target.value }),
    };
  }

  return (
    <>
      <InputField label="Calle y número" {...field("linea1")} autoComplete="shipping address-line1"
        placeholder="Av. Reforma 123, Col. Centro" maxLength={160} required />
      <div className="form-grid">
        <InputField label="Ciudad" {...field("ciudad")} autoComplete="shipping address-level2" maxLength={80} required />
        <InputField label="Estado" {...field("estado")} autoComplete="shipping address-level1" maxLength={80} required />
      </div>
      <div className="form-grid">
        <InputField label="Código postal" {...field("cp")} autoComplete="shipping postal-code"
          inputMode="numeric" pattern="[0-9]{5}" maxLength={5} placeholder="06600" title="Ingresa un código postal de 5 dígitos" required />
        <InputField label="País" {...field("pais")} autoComplete="shipping country-name" maxLength={60} required />
      </div>
    </>
  );
}
