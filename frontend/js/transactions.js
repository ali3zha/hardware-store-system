const transactionsBody = document.getElementById("transactionsBody");
const txMessage = document.getElementById("txMessage");
const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const resetFilterBtn = document.getElementById("resetFilterBtn");
const logoutLink = document.getElementById("logoutLink");

let allTransactions = [];

logoutLink?.addEventListener("click", () => {
  window.API.clearAuth();
});

function money(v) {
  return Number(v || 0).toFixed(2);
}

function safeDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function statusClass(status = "") {
  const s = status.toLowerCase();
  if (s === "completed") return "status-completed";
  if (s === "pending") return "status-pending";
  if (s === "cancelled") return "status-cancelled";
  return "status-pending";
}

function normalizeRow(raw) {
  return {
    sale_id: raw.sale_id ?? raw.id ?? "",
    sale_date: raw.sale_date ?? raw.date ?? "",
    user_display:
      raw.user_name ??
      raw.cashier ??
      (raw.user_id ? `User #${raw.user_id}` : "N/A"),
    total_amount: raw.total_amount ?? raw.total ?? 0,
    payment_method: raw.payment_method ?? "N/A",
    status: raw.status ?? "pending",
    items: raw.items || [],
    amount_tendered: raw.amount_tendered,
    change_given: raw.change_given,
    subtotal: raw.subtotal,
    discount_amount: raw.discount_amount,
    tax_amount: raw.tax_amount,
  };
}

function renderRows(rows) {
  transactionsBody.innerHTML = "";

  if (!rows.length) {
    transactionsBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#64748b; padding:20px;">
          No transactions found.
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.sale_id}</td>
      <td>${safeDate(row.sale_date)}</td>
      <td>${row.user_display}</td>
      <td>₱ ${money(row.total_amount)}</td>
      <td>${row.payment_method}</td>
      <td><span class="status-pill ${statusClass(row.status)}">${row.status}</span></td>
      <td><button class="details-btn" data-id="${row.sale_id}">View Details</button></td>
    `;
    transactionsBody.appendChild(tr);
  });

  document.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const tx = allTransactions.find((t) => String(t.sale_id) === String(id));
      if (!tx) return;

      // Save for receipt page
      localStorage.setItem("lastSale", JSON.stringify(tx));
      window.location.href = "./receipt.html";
    });
  });
}

function applyDateFilter() {
  const from = fromDateEl.value ? new Date(fromDateEl.value) : null;
  const to = toDateEl.value ? new Date(toDateEl.value) : null;

  const filtered = allTransactions.filter((row) => {
    if (!row.sale_date) return false;
    const d = new Date(row.sale_date);
    if (isNaN(d.getTime())) return false;

    if (from && d < from) return false;

    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }

    return true;
  });

  renderRows(filtered);
  txMessage.textContent = `Showing ${filtered.length} transaction(s).`;
}

function resetFilters() {
  fromDateEl.value = "";
  toDateEl.value = "";
  renderRows(allTransactions);
  txMessage.textContent = `Showing ${allTransactions.length} transaction(s).`;
}

async function loadTransactions() {
  txMessage.textContent = "Loading transactions...";

  try {
    const data = await window.API.get("/sales"); // requires backend endpoint
    const rows = Array.isArray(data.data) ? data.data : [];
    allTransactions = rows.map(normalizeRow);

    renderRows(allTransactions);
    txMessage.textContent = `Loaded ${allTransactions.length} transaction(s) from API.`;
  } catch (err) {
    // fallback mock if endpoint not ready
    allTransactions = [
      {
        sale_id: 1001,
        sale_date: "2026-04-28T09:15:00",
        user_display: "Cashier #2",
        total_amount: 433.44,
        payment_method: "cash",
        status: "completed",
      },
      {
        sale_id: 1002,
        sale_date: "2026-04-28T11:40:00",
        user_display: "Cashier #2",
        total_amount: 220.0,
        payment_method: "cash",
        status: "pending",
      },
      {
        sale_id: 1003,
        sale_date: "2026-04-29T13:05:00",
        user_display: "Cashier #1",
        total_amount: 990.5,
        payment_method: "cash",
        status: "completed",
      },
    ];

    renderRows(allTransactions);
    txMessage.textContent =
      "GET /api/sales not available yet. Showing temporary mock data.";
  }
}

applyFilterBtn.addEventListener("click", applyDateFilter);
resetFilterBtn.addEventListener("click", resetFilters);

loadTransactions();