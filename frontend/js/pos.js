(() => {
  const API_PRODUCTS = "/api/products";
  const API_SALES = "/api/sales";
  const TAX_RATE = 0.12;

  const productTableBody = document.getElementById("productTableBody");
  const productEmpty = document.getElementById("productEmpty");
  const cartTableBody = document.getElementById("cartTableBody");
  const cartEmpty = document.getElementById("cartEmpty");

  const customerIdInput = document.getElementById("customerIdInput");
  const discountIdInput = document.getElementById("discountIdInput");
  const amountTenderedInput = document.getElementById("amountTenderedInput");

  const subtotalText = document.getElementById("subtotalText");
  const discountText = document.getElementById("discountText");
  const taxText = document.getElementById("taxText");
  const totalText = document.getElementById("totalText");
  const changeText = document.getElementById("changeText");
  const statusText = document.getElementById("statusText");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const clearBtn = document.getElementById("clearBtn");

  // Exit if script is loaded on a different page.
  if (
    !productTableBody ||
    !productEmpty ||
    !cartTableBody ||
    !cartEmpty ||
    !customerIdInput ||
    !discountIdInput ||
    !amountTenderedInput ||
    !subtotalText ||
    !discountText ||
    !taxText ||
    !totalText ||
    !changeText ||
    !statusText ||
    !checkoutBtn ||
    !clearBtn
  ) {
    return;
  }

  let products = [];
  let cart = [];

  init();

  async function init() {
    await loadProducts();
    renderCart();
  }

  async function loadProducts() {
    setStatus("Loading products...", false);
    productTableBody.innerHTML = "";
    productEmpty.style.display = "block";
    productEmpty.textContent = "Loading products...";

    try {
      const response = await fetch(API_PRODUCTS);
      if (!response.ok) {
        throw new Error(`Failed to load products (${response.status})`);
      }

      const data = await response.json();
      products = Array.isArray(data) ? data : [];
      renderProducts();
      setStatus("", false);
    } catch (error) {
      console.error(error);
      productEmpty.textContent = "Failed to load products from /api/products.";
      setStatus("Failed to load products.", true);
    }
  }

  function renderProducts() {
    productTableBody.innerHTML = "";

    if (!products.length) {
      productEmpty.style.display = "block";
      productEmpty.textContent = "No products available.";
      return;
    }

    productEmpty.style.display = "none";

    products.forEach((product) => {
      const id = product.id ?? product.product_id ?? "";
      const name = product.name ?? product.product_name ?? "Unnamed";
      const price = Number(product.price ?? 0);
      const stock = Number(product.stock ?? product.quantity ?? 0);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(String(id))}</td>
        <td>${escapeHtml(String(name))}</td>
        <td>${money(price)}</td>
        <td>${stock}</td>
        <td><input class="qty-input" type="number" min="1" max="${Math.max(stock, 1)}" value="1" /></td>
        <td><button type="button" class="btn">Add to Cart</button></td>
      `;

      const qtyInput = row.querySelector("input");
      const addBtn = row.querySelector("button");

      if (!qtyInput || !addBtn) return;

      addBtn.addEventListener("click", () => {
        const qty = Number(qtyInput.value || 0);
        if (!qty || qty < 1) {
          setStatus("Enter valid quantity.", true);
          return;
        }

        if (qty > stock) {
          setStatus(`Not enough stock for ${name}.`, true);
          return;
        }

        addToCart({ id, name, price, stock }, qty);
      });

      productTableBody.appendChild(row);
    });
  }

  function addToCart(product, qtyToAdd) {
    const existing = cart.find((item) => String(item.id) === String(product.id));

    if (existing) {
      const nextQty = existing.qty + qtyToAdd;
      if (nextQty > product.stock) {
        setStatus(`Cart qty exceeds stock for ${product.name}.`, true);
        return;
      }
      existing.qty = nextQty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        qty: qtyToAdd
      });
    }

    renderCart();
    setStatus(`${product.name} added to cart.`, false);
  }

  cartTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.action === "remove") {
      const id = target.dataset.id;
      cart = cart.filter((item) => String(item.id) !== String(id));
      renderCart();
    }
  });

  clearBtn.addEventListener("click", () => {
    cart = [];
    amountTenderedInput.value = "";
    renderCart();
    setStatus("Cart cleared.", false);
  });

  amountTenderedInput.addEventListener("input", renderCart);
  discountIdInput.addEventListener("input", renderCart);

  checkoutBtn.addEventListener("click", async () => {
    if (!cart.length) {
      setStatus("Cart is empty.", true);
      return;
    }

    const totals = computeTotals();
    const amountTendered = Number(amountTenderedInput.value || 0);

    if (amountTendered < totals.total) {
      setStatus("Amount tendered is not enough.", true);
      return;
    }

    const payload = {
      customer_id: parseOptionalInt(customerIdInput.value),
      discount_id: parseOptionalInt(discountIdInput.value),
      amount_tendered: amountTendered,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      items: cart.map((item) => ({
        product_id: item.id,
        qty: item.qty,
        price: item.price
      }))
    };

    if (payload.customer_id === null) delete payload.customer_id;
    if (payload.discount_id === null) delete payload.discount_id;

    try {
      setStatus("Processing checkout...", false);
      checkoutBtn.disabled = true;

      const response = await fetch(API_SALES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = result?.message || `Checkout failed (${response.status}).`;
        throw new Error(msg);
      }

      const receiptData = {
        ...result,
        sale_id: result.sale_id ?? result.id ?? crypto.randomUUID(),
        date_time: result.date_time ?? result.created_at ?? new Date().toLocaleString(),
        items: payload.items.map((item) => {
          const fromCart = cart.find((c) => String(c.id) === String(item.product_id));
          return {
            product_id: item.product_id,
            name: fromCart?.name ?? "Item",
            qty: item.qty,
            price: item.price
          };
        }),
        subtotal: payload.subtotal,
        discount: payload.discount,
        tax: payload.tax,
        total: payload.total,
        amount_tendered: payload.amount_tendered,
        change: Math.max(0, payload.amount_tendered - payload.total)
      };

      sessionStorage.setItem("lastSaleReceipt", JSON.stringify(receiptData));
      saveSaleHistory(receiptData);

      setStatus("Checkout successful! Redirecting to receipt...", false);
      cart = [];
      amountTenderedInput.value = "";
      renderCart();
      await loadProducts();

      setTimeout(() => {
        window.location.href = "./receipt.html";
      }, 500);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Checkout failed.", true);
    } finally {
      checkoutBtn.disabled = false;
    }
  });

  function renderCart() {
    cartTableBody.innerHTML = "";

    if (!cart.length) {
      cartEmpty.style.display = "block";
    } else {
      cartEmpty.style.display = "none";
    }

    cart.forEach((item) => {
      const lineTotal = item.price * item.qty;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(String(item.id))}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${money(item.price)}</td>
        <td>${item.qty}</td>
        <td>${money(lineTotal)}</td>
        <td><button type="button" data-action="remove" data-id="${escapeHtml(String(item.id))}" class="btn btn-danger">Remove</button></td>
      `;
      cartTableBody.appendChild(row);
    });

    const totals = computeTotals();
    const amountTendered = Number(amountTenderedInput.value || 0);
    const change = Math.max(0, amountTendered - totals.total);

    subtotalText.textContent = money(totals.subtotal);
    discountText.textContent = money(totals.discount);
    taxText.textContent = money(totals.tax);
    totalText.textContent = money(totals.total);
    changeText.textContent = money(change);
  }

  function computeTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    // UI estimate: if discount_id is present, apply mock 10%.
    // Backend should enforce official discount rules.
    const hasDiscount = discountIdInput.value.trim() !== "";
    const discount = hasDiscount ? subtotal * 0.1 : 0;

    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * TAX_RATE;
    const total = taxable + tax;

    return { subtotal, discount, tax, total };
  }

  function parseOptionalInt(value) {
    const cleaned = String(value || "").trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isInteger(num) && num > 0 ? num : null;
  }

  function saveSaleHistory(receiptData) {
    const key = "salesHistory";
    try {
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const list = Array.isArray(existing) ? existing : [];
      list.unshift(receiptData);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
    } catch {
      localStorage.setItem(key, JSON.stringify([receiptData]));
    }
  }

  function money(value) {
    return `PHP ${Number(value || 0).toFixed(2)}`;
  }

  function setStatus(message, isError) {
    statusText.textContent = message;
    statusText.className = `status ${isError ? "err" : "ok"}`;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }
})();
