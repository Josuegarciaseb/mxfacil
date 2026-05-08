const Spinner = ({ size = 36 }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 48,
    }}
  >
    <div
      style={{
        width: size,
        height: size,
        border: "3px solid var(--gray-200)",
        borderTop: "3px solid var(--red)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
  </div>
);

export default Spinner;
