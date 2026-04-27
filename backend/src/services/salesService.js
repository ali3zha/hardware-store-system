function computeTotals(items, discount = null, taxRate = 0.12) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  let discountAmount = 0;
  if (discount) {
    if (discount.type === "percent") discountAmount = subtotal * (Number(discount.value) / 100);
    if (discount.type === "fixed") discountAmount = Number(discount.value);
  }

  if (discountAmount > subtotal) discountAmount = subtotal;

  const taxBase = subtotal - discountAmount;
  const taxAmount = taxBase * taxRate;
  const totalAmount = taxBase + taxAmount;

  return { subtotal, discountAmount, taxAmount, totalAmount };
}

module.exports = { computeTotals };