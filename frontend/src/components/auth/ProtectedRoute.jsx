import { Navigate, useLocation } from "react-router-dom";

/**
 * ProtectedRoute — guarda una ruta según autenticación y rol.
 *
 * Props:
 *   user      — objeto de usuario (null = invitado)
 *   token     — JWT (null = sin sesión)
 *   roles     — array de roles permitidos, e.g. ["admin"] o ["cliente", "admin"]
 *               Si se omite, solo requiere estar autenticado.
 *   children  — componente a renderizar si pasa la validación
 */
const ProtectedRoute = ({ user, token, roles, children }) => {
  const location = useLocation();

  // Sin sesión → redirige a /auth, guardando de dónde venía
  if (!token || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Con sesión pero rol incorrecto → redirige a su página de inicio
  if (roles && !roles.includes(user.rol)) {
    const home =
      user.rol === "admin"    ? "/admin/dashboard"    :
      user.rol === "vendedor" ? "/vendedor/dashboard" :
                                "/catalogo";
    return <Navigate to={home} replace />;
  }

  return children;
};

export default ProtectedRoute;
