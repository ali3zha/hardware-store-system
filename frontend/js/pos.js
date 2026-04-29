const API_BASE = "http://localhost:5000/api";

const token = localStorage.getItem("token");

const productsBody = document.getElementById("productsBody");
const cartBody = document.getElementById("cartBody");

const subtotalEl = document.getElementById("subtotalEl");
const discountEl = document.getElementById("discountEl");
const taxEl = document.getElementById("taxEl");
const totalEl = document.getElementById("totalEl");

const customerIdEl = document.getElementById("customerIdEl");
const discountIdEl = document.getElementById("discountIdEl");
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

function money(n) {
  return Number(n || 0).toFixed(2);
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

  subtotalEl.textContent = money(subtotal);

  // Before checkout, keep discount/tax/total = 0
  discountEl.textContent = money(0);
  taxEl.textContent = money(0);
  totalEl.textContent = money(subtotal);
}

function cartItemsForAPI() {
  return cart.map((c) => ({
    product_id: c.product_id,
    quantity: c.quantity,
  }));
}

function buildReceiptPayload(checkoutData) {
  const soldItems = cart.map((item) => ({
    product_id: item.product_id,
    name: item.name,
    qty: item.quantity,
    price: item.unit_price,
  }));

  return {
    sale_id: checkoutData.sale_id,
    date_time: new Date().toLocaleString(),
    items: soldItems,
    subtotal: Number(checkoutData.subtotal || 0),
    discount: Number(checkoutData.discountAmount || 0),
    tax: Number(checkoutData.taxAmount || 0),
    total: Number(checkoutData.totalAmount || 0),
    amount_tendered: Number(tenderedEl.value || 0),
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
}

async function checkout() {
  const t = requireAuthOrRedirect();
  if (!t) return;

  if (!cart.length) return showMessage("Cart is empty.", true);

  const tendered = Number(tenderedEl.value || 0);
  const customerIdRaw = customerIdEl.value;
  const discountIdRaw = discountIdEl.value;

  const payload = {
    customer_id: customerIdRaw ? Number(customerIdRaw) : null,
    discount_id: discountIdRaw ? Number(discountIdRaw) : null,
    payment_method: "cash",
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

  const receiptPayload = buildReceiptPayload(d);
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

checkoutBtn.addEventListener("click", () => {
  checkout().catch((e) => showMessage(e.message, true));
});

// Auto load
if (localStorage.getItem("token")) {
  loadProducts().catch((e) => showMessage(e.message, true));
} else {
  window.location.href = "./login.html";
}
