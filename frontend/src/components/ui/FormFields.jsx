export const InputField = ({ label, ...props }) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <input {...props} />
  </div>
);

export const SelectField = ({ label, children, ...props }) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <select {...props}>{children}</select>
  </div>
);
