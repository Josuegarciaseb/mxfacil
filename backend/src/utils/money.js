// DECIMAL amounts are converted to integer cents before arithmetic.
function cents(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error('Importe inválido');
  return Math.round((number + Number.EPSILON) * 100);
}
const publicPriceCents = (value) => Math.round(cents(value) * 102 / 100);
module.exports = { cents, publicPriceCents };
