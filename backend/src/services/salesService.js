/** 2 decimal places — avoids float noise breaking tendered === total comparisons */
function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return x;
  return Math.round(x * 100) / 100;
}

function normalizeDiscountType(discount) {
  const rawType = String(discount?.type || "")
    .trim()
    .toLowerCase();
  if (rawType === "percent" || rawType === "percentage") return "percentage";
  if (rawType === "fixed") return "fixed";

  // Fallback for bad legacy rows (e.g. enum mismatch) where type becomes blank.
  const name = String(discount?.name || "").toLowerCase();
  if (name.includes("%")) return "percentage";
  return "fixed";
}

function isVatExemptDiscount(discount) {
  const name = String(discount?.name || "").toLowerCase();
  // Common PH rule: PWD/Senior purchases may be VAT-exempt + discount.
  return name.includes("pwd") || name.includes("senior");
}

function computeTotals(items, discount = null, taxRate = 0.12) {
  let subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  subtotal = round2(subtotal);

  // VAT-exempt flow for PWD/Senior: remove VAT first, then apply discount.
  const vatExempt = discount ? isVatExemptDiscount(discount) : false;
  const discountBase = vatExempt ? round2(subtotal / (1 + Number(taxRate || 0))) : subtotal;

  let discountAmount = 0;
  if (discount) {
    const t = normalizeDiscountType(discount);
    if (t === "percentage")
      discountAmount = round2(discountBase * (Number(discount.value) / 100));
    if (t === "fixed") discountAmount = round2(Number(discount.value));
  }

  if (discountAmount > discountBase) discountAmount = discountBase;

  const taxBase = round2(discountBase - discountAmount);
  const taxAmount = vatExempt ? 0 : round2(taxBase * taxRate);
  const totalAmount = round2(taxBase + taxAmount);

  return { subtotal, discountAmount, taxAmount, totalAmount };
}

module.exports = { computeTotals };