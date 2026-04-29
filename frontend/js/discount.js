(() => {
  /**
   * Discount utility for POS pages.
   * Exposes helpers via window.DiscountUtils
   */

  const DISCOUNT_TYPES = {
    NONE: "none",
    PERCENT: "percent",
    FIXED: "fixed",
    SENIOR: "senior",
    PWD: "pwd"
  };

  const DEFAULT_SPECIAL_RATE = 0.2; // 20%

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Computes discount amount from subtotal and config.
   * @param {number} subtotal
   * @param {{ type?: string, value?: number }} config
   * @returns {{ type: string, rate: number, amount: number, subtotal: number, total: number }}
   */
  function calculateDiscount(subtotal, config = {}) {
    const normalizedSubtotal = Math.max(0, toNumber(subtotal, 0));
    const type = String(config.type || DISCOUNT_TYPES.NONE).toLowerCase();
    const rawValue = Math.max(0, toNumber(config.value, 0));

    let rate = 0;
    let amount = 0;

    if (type === DISCOUNT_TYPES.PERCENT) {
      rate = clamp(rawValue / 100, 0, 1);
      amount = normalizedSubtotal * rate;
    } else if (type === DISCOUNT_TYPES.FIXED) {
      amount = clamp(rawValue, 0, normalizedSubtotal);
      rate = normalizedSubtotal ? amount / normalizedSubtotal : 0;
    } else if (type === DISCOUNT_TYPES.SENIOR || type === DISCOUNT_TYPES.PWD) {
      rate = DEFAULT_SPECIAL_RATE;
      amount = normalizedSubtotal * rate;
    } else {
      rate = 0;
      amount = 0;
    }

    amount = clamp(amount, 0, normalizedSubtotal);
    const total = Math.max(0, normalizedSubtotal - amount);

    return {
      type,
      rate,
      amount,
      subtotal: normalizedSubtotal,
      total
    };
  }

  /**
   * Computes payment and change after discount.
   * @param {number} subtotal
   * @param {{ type?: string, value?: number }} discountConfig
   * @param {number} payment
   * @returns {{
   *   discount: { type: string, rate: number, amount: number, subtotal: number, total: number },
   *   payment: number,
   *   change: number,
   *   remaining: number,
   *   isPaid: boolean
   * }}
   */
  function calculatePaymentSummary(subtotal, discountConfig, payment) {
    const discount = calculateDiscount(subtotal, discountConfig);
    const normalizedPayment = Math.max(0, toNumber(payment, 0));
    const change = Math.max(0, normalizedPayment - discount.total);
    const remaining = Math.max(0, discount.total - normalizedPayment);

    return {
      discount,
      payment: normalizedPayment,
      change,
      remaining,
      isPaid: remaining <= 0
    };
  }

  /**
   * Formats number to PHP currency string.
   * @param {number} value
   * @returns {string}
   */
  function formatPHP(value) {
    return `PHP ${toNumber(value, 0).toFixed(2)}`;
  }

  window.DiscountUtils = {
    DISCOUNT_TYPES,
    calculateDiscount,
    calculatePaymentSummary,
    formatPHP
  };
})();
