import { useCallback, useEffect, useState } from "react";
import { http } from "../utils/api";

export function useVendorAccount(token, pagina) {
  const [result,setResult] = useState(null);
  useEffect(()=>{
    if (!token) return;
    let active = true;
    http("/proveedores/me",{},token).then(data=>{if(active)setResult({token,...data});})
      .catch(()=>{if(active)setResult(null);});
    return ()=>{active=false;};
  },[token,pagina]);
  const setCount = useCallback(total => setResult(data=>data?.token===token ? {...data,productos_total:total} : data),[token]);
  return [result?.token===token ? result : null, setCount];
}
