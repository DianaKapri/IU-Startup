const SCHOOL_PRICE_YEAR = 29000;
const SCHOOL_PRICE_MONTH = 2416;
const SCHOOL_PAYMENT_AMOUNT = 1;

function formatPrice(amount) {
  return amount.toLocaleString('ru-RU');
}

module.exports = { SCHOOL_PRICE_YEAR, SCHOOL_PRICE_MONTH, SCHOOL_PAYMENT_AMOUNT, formatPrice };