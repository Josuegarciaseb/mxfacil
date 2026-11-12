import { useEffect, useState } from "react";
import { http } from "../utils/api";

export function useDeliveryAddresses(token) {
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!token) return;
    let active = true;
    http("/direcciones", {}, token)
      .then(addresses => {
        if (active) setResult({ token, revision, addresses });
      })
      .catch(error => {
        if (active) setResult({ token, revision, error: error.message });
      });
    return () => { active = false; };
  }, [token, revision]);

  const current = token && result?.token === token ? result : null;
  const addresses = current?.addresses ?? [];
  return {
    addresses,
    primary: addresses.find(address => Number(address.es_principal) === 1),
    loading: Boolean(token && current?.revision !== revision),
    error: current?.revision === revision ? current.error : null,
    refresh: () => setRevision(value => value + 1),
  };
}
