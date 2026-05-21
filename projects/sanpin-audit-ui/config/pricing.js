const SCHOOL_PRICE_YEAR = 13999;
const SCHOOL_PRICE_MONTH = 1166;

function formatPrice(amount) {
  return amount.toLocaleString('ru-RU');
}

module.exports = { SCHOOL_PRICE_YEAR, SCHOOL_PRICE_MONTH, formatPrice };