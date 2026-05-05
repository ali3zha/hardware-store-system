const API_BASE = "http://localhost:5000/api";

const token = localStorage.getItem("token");

const productsBody = document.getElementById("productsBody");
const cartBody = document.getElementById("cartBody");

const subtotalEl = document.getElementById("subtotalEl");
const discountEl = document.getElementById("discountEl");
const taxEl = document.getElementById("taxEl");
const totalEl = document.getElementById("totalEl");

const customerIdEl = document.getElementById("customerIdEl");
const discountSelectEl = document.getElementById("discountSelectEl");
const paymentMethodEl = document.getElementById("paymentMethodEl");
const paymentReferenceWrapEl = document.getElementById("paymentReferenceWrap");
const paymentReferenceEl = document.getElementById("paymentReferenceEl");
const cardAuthWrapEl = document.getElementById("cardAuthWrap");
const cardAuthEl = document.getElementById("cardAuthEl");
const cardLast4WrapEl = document.getElementById("cardLast4Wrap");
const cardLast4El = document.getElementById("cardLast4El");
const tenderedEl = document.getElementById("tenderedEl");

const loadProductsBtn = document.getElementById("loadProductsBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const saleMessage = document.getElementById("saleMessage");

const logoutLink = document.getElementById("logoutLink");
logoutLink?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "./login.html";
});

let products = [];
let cart = []; // { product_id, name, unit_price, quantity }
/** Mirrors backend default TAX_RATE / computeTotals so the cart preview matches checkout. */
let activeDiscounts = []; // from GET /discounts
const POS_TAX_RATE = 0.12;

function money(n) {
  return Number(n || 0).toFixed(2);
}

function roundMoney2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

function isVatExemptDiscount(discount) {
  const name = String(discount?.name || "").toLowerCase();
  return name.includes("pwd") || name.includes("senior");
}

/** Same logic as backend/services/salesService.computeTotals for cart preview. */
function previewTotalsFromSubtotal(subtotalRaw) {
  let subtotal = roundMoney2(subtotalRaw);
  let discountAmount = 0;
  const idRaw = discountSelectEl?.value;
  let discountBase = subtotal;
  let taxExempt = false;
  if (idRaw && activeDiscounts.length) {
    const discount = activeDiscounts.find((d) => Number(d.discount_id) === Number(idRaw));
    if (discount && (discount.status || "active") === "active") {
      taxExempt = isVatExemptDiscount(discount);
      discountBase = taxExempt ? roundMoney2(subtotal / (1 + POS_TAX_RATE)) : subtotal;
      const t = String(discount.type || "").toLowerCase();
      if (t === "percent" || t === "percentage")
        discountAmount = roundMoney2(discountBase * (Number(discount.value) / 100));
      if (t === "fixed") discountAmount = roundMoney2(Number(discount.value));
    }
  }
  if (discountAmount > discountBase) discountAmount = discountBase;
  const taxBase = roundMoney2(discountBase - discountAmount);
  const taxAmount = taxExempt ? 0 : roundMoney2(taxBase * POS_TAX_RATE);
  const totalAmount = roundMoney2(taxBase + taxAmount);
  return { subtotal, discountAmount, taxAmount, totalAmount };
}

function requiresPaymentReference(paymentMethod) {
  return paymentMethod === "gcash" || paymentMethod === "bank_transfer";
}

function updatePaymentReferenceUI() {
  const method = String(paymentMethodEl?.value || "cash");
  const requiresRef = requiresPaymentReference(method);
  const isCard = method === "card";
  if (paymentReferenceWrapEl) paymentReferenceWrapEl.style.display = requiresRef ? "block" : "none";
  if (cardAuthWrapEl) cardAuthWrapEl.style.display = isCard ? "block" : "none";
  if (cardLast4WrapEl) cardLast4WrapEl.style.display = isCard ? "block" : "none";
  if (paymentReferenceEl) {
    paymentReferenceEl.required = requiresRef;
    if (!requiresRef) paymentReferenceEl.value = "";
  }
  if (cardAuthEl) {
    cardAuthEl.required = isCard;
    if (!isCard) cardAuthEl.value = "";
  }
  if (cardLast4El) {
    cardLast4El.required = isCard;
    if (!isCard) cardLast4El.value = "";
  }
}

updatePaymentReferenceUI();
paymentMethodEl?.addEventListener("change", updatePaymentReferenceUI);

function parseAmountInput(inputEl) {
  const raw = String(inputEl?.value ?? "")
    .trim()
    .replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function showMessage(msg, isError = false) {
  saleMessage.textContent = msg;
  saleMessage.style.color = isError ? "#dc2626" : "#15803d";
}

function requireAuthOrRedirect() {
  const t = localStorage.getItem("token");
  if (!t) {
    showMessage("Please login first.", true);
    window.location.href = "./login.html";
    return null;
  }
  return t;
}

function renderProducts() {
  productsBody.innerHTML = "";

  products.forEach((p) => {
    const stock = Number(p.stock_qty ?? 0);
    const disabled = stock <= 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.product_id ?? ""}</td>
      <td>${p.name ?? ""}</td>
      <td>${money(p.selling_price)}</td>
      <td>${stock}</td>
      <td>
        <input type="number" min="1" step="1" value="1" id="qty-${p.product_id}" ${disabled ? "disabled" : ""} />
      </td>
      <td>
        <button class="btn" type="button" data-id="${p.product_id}" ${disabled ? "disabled" : ""}>Add</button>
      </td>
    `;
    productsBody.appendChild(tr);
  });

  productsBody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const qtyInput = document.getElementById(`qty-${id}`);
      const qty = Number(qtyInput?.value || 1);
      addToCart(id, qty);
    });
  });
}

function addToCart(productId, qty) {
  const product = products.find((p) => Number(p.product_id) === Number(productId));
  if (!product) return;

  if (qty <= 0) return;

  const stock = Number(product.stock_qty ?? 0);
  if (qty > stock) return showMessage("Quantity exceeds available stock.", true);

  const existing = cart.find((c) => Number(c.product_id) === Number(productId));
  if (existing) existing.quantity += qty;
  else {
    cart.push({
      product_id: Number(productId),
      name: product.name,
      unit_price: Number(product.selling_price),
      quantity: qty,
    });
  }

  renderCart();
}

function renderCart() {
  cartBody.innerHTML = "";

  let subtotal = 0;

  cart.forEach((item) => {
    const line = item.quantity * item.unit_price;
    subtotal += line;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${money(item.unit_price)}</td>
      <td>${money(line)}</td>
      <td>
        <button class="btn" type="button" data-remove="${item.product_id}">Remove</button>
      </td>
    `;
    cartBody.appendChild(tr);
  });

  cartBody.querySelectorAll("button[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-remove"));
      cart = cart.filter((x) => Number(x.product_id) !== id);
      renderCart();
    });
  });

  const totals = previewTotalsFromSubtotal(subtotal);
  subtotalEl.textContent = money(totals.subtotal);
  discountEl.textContent = money(totals.discountAmount);
  taxEl.textContent = money(totals.taxAmount);
  totalEl.textContent = money(totals.totalAmount);
}

function cartItemsForAPI() {
  return cart.map((c) => ({
    product_id: c.product_id,
    quantity: c.quantity,
  }));
}

function buildReceiptPayload(checkoutData, extras = {}) {
  const soldItems = cart.map((item) => ({
    product_id: item.product_id,
    name: item.name,
    qty: item.quantity,
    price: item.unit_price,
  }));

  const pm =
    extras.payment_method ??
    checkoutData.payment_method ??
    paymentMethodEl?.value ??
    "cash";
  const tenderedAmt =
    extras.amount_tendered != null
      ? Number(extras.amount_tendered)
      : parseAmountInput(tenderedEl);
  const paymentReference =
    extras.payment_reference != null ? String(extras.payment_reference) : null;

  return {
    sale_id: checkoutData.sale_id,
    date_time: new Date().toLocaleString(),
    items: soldItems,
    subtotal: Number(checkoutData.subtotal || 0),
    discount: Number(checkoutData.discountAmount || 0),
    tax: Number(checkoutData.taxAmount || 0),
    total: Number(checkoutData.totalAmount || 0),
    payment_method: pm,
    payment_reference: paymentReference,
    amount_tendered: tenderedAmt,
    change: Number(checkoutData.change_given || 0),
  };
}

function saveReceipt(receipt) {
  sessionStorage.setItem("lastSaleReceipt", JSON.stringify(receipt));
  localStorage.setItem("lastSaleReceipt", JSON.stringify(receipt));

  const existing = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  const next = [receipt, ...existing].slice(0, 30);
  localStorage.setItem("salesHistory", JSON.stringify(next));
}

async function loadDiscounts() {
  const t = requireAuthOrRedirect();
  if (!t) return;

  const res = await fetch(`${API_BASE}/discounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${t}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Failed to load discounts");
  }

  const rows = data.data || [];
  activeDiscounts = rows;
  if (!discountSelectEl) return;

  discountSelectEl.innerHTML = '<option value="">None</option>';
  rows
    .filter((d) => (d.status || "active") === "active")
    .forEach((d) => {
      const opt = document.createElement("option");
      opt.value = String(d.discount_id);
      opt.textContent = d.name || `Discount #${d.discount_id}`;
      discountSelectEl.appendChild(opt);
    });
}

async function loadProducts() {
  const t = requireAuthOrRedirect();
  if (!t) return;

  const res = await fetch(`${API_BASE}/products`, {
    method: "GET",
    headers: { Authorization: `Bearer ${t}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Failed to load products");
  }

  products = data.data || data || [];
  cart = [];
  renderCart();
  renderProducts();
  loadDiscounts().catch(() => {});
}

async function checkout() {
  const t = requireAuthOrRedirect();
  if (!t) return;

  if (!cart.length) return showMessage("Cart is empty.", true);

  const subtotalPreview = cart.reduce((s, item) => s + item.quantity * item.unit_price, 0);
  const dueNow = previewTotalsFromSubtotal(subtotalPreview).totalAmount;

  const tendered = parseAmountInput(tenderedEl);
  const dueCents = Math.round(dueNow * 100);
  const tenderCents = Math.round(tendered * 100);
  if (tenderCents < dueCents) {
    return showMessage(
      `Insufficient amount tendered. Amount due is ${money(dueNow)} (includes tax). You entered ${money(tendered)}.`,
      true
    );
  }
  const customerIdRaw = customerIdEl.value;
  const discountIdRaw = discountSelectEl?.value;

  let customer_id = null;
  if (String(customerIdRaw ?? "").trim() !== "") {
    const cid = Number(customerIdRaw);
    if (Number.isFinite(cid) && cid > 0) customer_id = cid;
  }
  let discount_id = null;
  if (String(discountIdRaw ?? "").trim() !== "") {
    const did = Number(discountIdRaw);
    // NaN turns into JSON null — server skips discount while UI preview still applies the selection
    if (Number.isFinite(did) && did > 0) discount_id = did;
  }

  const paymentMethod = String(paymentMethodEl?.value || "cash").trim() || "cash";
  const paymentReference = String(paymentReferenceEl?.value ?? "").trim();
  const cardAuthCode = String(cardAuthEl?.value ?? "").trim();
  const cardLast4 = String(cardLast4El?.value ?? "").trim();

  if (requiresPaymentReference(paymentMethod)) {
    if (!paymentReference || paymentReference.length < 5) {
      return showMessage(
        `Please enter the payment reference (GCash/B​ank TRN) before checkout.`,
        true
      );
    }
  }
  if (paymentMethod === "card") {
    if (!cardAuthCode || cardAuthCode.length < 4) {
      return showMessage("Please enter a valid card auth code before checkout.", true);
    }
    if (!/^\d{4}$/.test(cardLast4)) {
      return showMessage("Please enter card last 4 digits (exactly 4 numbers).", true);
    }
  }

  let paymentReferenceForReceipt = paymentReference || null;
  if (paymentMethod === "card") {
    paymentReferenceForReceipt = `AUTH:${cardAuthCode} | CARD:*${cardLast4}`;
  }

  const payload = {
    customer_id,
    discount_id,
    payment_method: paymentMethod,
    payment_reference: paymentReferenceForReceipt,
    card_auth_code: cardAuthCode || null,
    card_last4: cardLast4 || null,
    amount_tendered: tendered,
    items: cartItemsForAPI(),
  };

  showMessage("Processing sale...");
  saleMessage.style.color = "#0f766e";

  const res = await fetch(`${API_BASE}/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    return showMessage(data.message || "Checkout failed", true);
  }

  const d = data.data || {};
  // Expected from backend: subtotal, discountAmount, taxAmount, totalAmount, change_given, sale_id
  subtotalEl.textContent = money(d.subtotal);
  discountEl.textContent = money(d.discountAmount);
  taxEl.textContent = money(d.taxAmount);
  totalEl.textContent = money(d.totalAmount);

  showMessage(
    `Sale successful! Sale ID: ${d.sale_id} | Total: ${money(d.totalAmount)} | Change: ${money(d.change_given)}`
  );

  const receiptPayload = buildReceiptPayload(d, {
    amount_tendered: tendered,
    payment_method: d.payment_method ?? paymentMethod,
    payment_reference: paymentReferenceForReceipt,
  });
  saveReceipt(receiptPayload);
  localStorage.setItem("lastSale", JSON.stringify(d));

  cart = [];
  renderCart();

  // refresh stock/products (optional)
  await loadProducts();

  // Auto-open receipt page after successful checkout
  window.setTimeout(() => {
    window.location.href = "./receipt.html";
  }, 400);
}

loadProductsBtn.addEventListener("click", () => {
  loadProducts().catch((e) => showMessage(e.message, true));
});

discountSelectEl?.addEventListener("change", () => {
  renderCart();
});

checkoutBtn.addEventListener("click", () => {
  checkout().catch((e) => showMessage(e.message, true));
});

// Auto load (loadProducts also refreshes the discount dropdown)
if (localStorage.getItem("token")) {
  loadProducts().catch((e) => showMessage(e.message, true));
} else {
  window.location.href = "./login.html";
}
