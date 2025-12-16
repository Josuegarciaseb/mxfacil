// src/utils/validators.js

// Correo tipo "algo@ejemplo.com"
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Nombre: solo letras (incluye acentos) y espacios
function isValidName(nombre) {
  if (typeof nombre !== 'string') return false;
  const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  return regex.test(nombre.trim());
}

// Teléfono: solo 10 dígitos
function isValidPhone(telefono) {
  if (typeof telefono !== 'string' && typeof telefono !== 'number') return false;
  const str = String(telefono).trim();
  const regex = /^\d{10}$/; // exactamente 10 dígitos
  return regex.test(str);
}

// Entero positivo (para cantidades, stock, etc.)
function isPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

// Número positivo (para precios, montos, etc.)
function isPositiveNumber(value) {
  const n = Number(value);
  return typeof n === 'number' && !isNaN(n) && n >= 0;
}

// CP mexicano: exactamente 5 dígitos
function isValidCP(cp) {
  if (typeof cp !== 'string' && typeof cp !== 'number') return false;
  const str = String(cp).trim();
  const regex = /^\d{5}$/; // 5 dígitos
  return regex.test(str);
}

// Ciudad / Estado / País: solo letras (con acentos) y espacios
function isValidLocationName(texto) {
  if (typeof texto !== 'string') return false;
  const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  return regex.test(texto.trim());
}

// Contraseña: mínimo 8 caracteres, al menos 1 mayúscula y 1 carácter especial
function isValidPassword(password) {
  if (typeof password !== 'string') return false;

  // Debe tener:
  // - Al menos 8 caracteres
  // - 1 letra mayúscula
  // - 1 símbolo especial
  const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>_\-]).{8,}$/;

  return regex.test(password);
}


module.exports = {
  isValidEmail,
  isValidName,
  isValidPhone,
  isPositiveInteger,
  isPositiveNumber,
  isValidCP,
  isValidLocationName,
  isValidPassword
};
