(() => {
  const STORAGE_LAST_KEY = "lastSaleReceipt";
  const STORAGE_HISTORY_KEY = "salesHistory";

  const saleIdText = document.getElementById("saleIdText");
  const dateTimeText = document.getElementById("dateTimeText");
  const itemsBody = document.getElementById("itemsBody");
  const subtotalText = document.getElementById("subtotalText");
  const discountText = document.getElementById("discountText");
  const taxText = document.getElementById("taxText");
  const totalText = document.getElementById("totalText");
  const tenderedText = document.getElementById("tenderedText");
  const changeText = document.getElementById("changeText");
  const approvalCodeText = document.getElementById("approvalCodeText");
  const printBtn = document.getElementById("printBtn");

  const receipt = loadLatestReceipt();
  renderReceipt(receipt);

  printBtn?.addEventListener("click", () => window.print());

  function renderReceipt(receiptData) {
    if (!receiptData) {
      itemsBody.innerHTML = `<tr><td colspan="2" class="empty">No receipt found. Checkout in POS first.</td></tr>`;
      saleIdText.textContent = "-";
      dateTimeText.textContent = "-";
      subtotalText.textContent = amountOnly(0);
      discountText.textContent = amountOnly(0);
      taxText.textContent = amountOnly(0);
      totalText.textContent = amountOnly(0);
      tenderedText.textContent = amountOnly(0);
      changeText.textContent = amountOnly(0);
      if (approvalCodeText) approvalCodeText.textContent = "#-";
      return;
    }

    saleIdText.textContent = safeText(receiptData.sale_id);
    dateTimeText.textContent = safeText(receiptData.date_time);

    const items = Array.isArray(receiptData.items) ? receiptData.items : [];
    itemsBody.innerHTML = items.length
      ? items
          .map((item) => {
            const qty = toNumber(item.qty, 0);
            const price = toNumber(item.price, 0);
            const lineTotal = qty * price;
            return `
              <tr>
                <td>${escapeHtml(String(item.name ?? "Item"))} x${qty}</td>
                <td>${amountOnly(lineTotal)}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="2" class="empty">No sold items.</td></tr>`;

    subtotalText.textContent = amountOnly(receiptData.subtotal);
    discountText.textContent = amountOnly(receiptData.discount);
    taxText.textContent = amountOnly(receiptData.tax);
    totalText.textContent = amountOnly(receiptData.total);
    tenderedText.textContent = amountOnly(receiptData.amount_tendered);
    changeText.textContent = amountOnly(receiptData.change);
    if (approvalCodeText) {
      const sid = String(receiptData.sale_id ?? "").replace(/\D/g, "");
      approvalCodeText.textContent = `#${sid || "123456"}`;
    }
  }

  function loadLatestReceipt() {
    const fromSession = parseJSON(sessionStorage.getItem(STORAGE_LAST_KEY));
    if (fromSession) return normalizeReceipt(fromSession);

    const fromLocal = parseJSON(localStorage.getItem(STORAGE_LAST_KEY));
    if (fromLocal) return normalizeReceipt(fromLocal);

    const history = parseJSON(localStorage.getItem(STORAGE_HISTORY_KEY));
    if (Array.isArray(history) && history.length > 0) return normalizeReceipt(history[0]);

    const lastSale = parseJSON(localStorage.getItem("lastSale"));
    if (lastSale) return normalizeReceipt(lastSale);

    return null;
  }

  function normalizeReceipt(raw) {
    const items = Array.isArray(raw.items) ? raw.items : [];
    const total = toNumber(raw.total ?? raw.totalAmount, 0);
    const amountTendered = toNumber(raw.amount_tendered ?? raw.amountTendered, 0);
    const change = toNumber(raw.change ?? raw.change_given ?? Math.max(0, amountTendered - total), 0);

    return {
      sale_id: raw.sale_id ?? raw.saleId ?? raw.id ?? "N/A",
      date_time: raw.date_time ?? raw.sale_date ?? raw.created_at ?? new Date().toLocaleString(),
      items: items.map((it) => ({
        product_id: it.product_id ?? it.productId ?? "",
        name: it.name ?? it.product_name ?? "Item",
        qty: toNumber(it.qty ?? it.quantity, 0),
        price: toNumber(it.price ?? it.unit_price, 0),
      })),
      subtotal: toNumber(raw.subtotal, 0),
      discount: toNumber(raw.discount ?? raw.discountAmount, 0),
      tax: toNumber(raw.tax ?? raw.taxAmount, 0),
      total,
      amount_tendered: amountTendered,
      change,
    };
  }

  function parseJSON(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function money(v) {
    return `PHP ${toNumber(v, 0).toFixed(2)}`;
  }

  function amountOnly(v) {
    return toNumber(v, 0).toFixed(2);
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }

  function safeText(v) {
    return String(v ?? "-");
  }
})();
