import { useId } from 'react';
export const InputField = ({ label, ...props }) => {
  const generated = useId();
  const id = props.id || generated;
  return (
  <div className="input-group">
    {label && <label htmlFor={id} className="input-label">{label}</label>}
    <input {...props} id={id} />
  </div>
  );
};

export const SelectField = ({ label, children, ...props }) => {
  const generated = useId();
  const id = props.id || generated;
  return (
  <div className="input-group">
    {label && <label htmlFor={id} className="input-label">{label}</label>}
    <select {...props} id={id}>{children}</select>
  </div>
  );
};
