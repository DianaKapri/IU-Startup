const SCHOOL_PRICE_YEAR = 29000;
const SCHOOL_PRICE_MONTH = 2400;

function formatPrice(amount) {
  return amount.toLocaleString('ru-RU');
}

module.exports = { SCHOOL_PRICE_YEAR, SCHOOL_PRICE_MONTH, formatPrice };