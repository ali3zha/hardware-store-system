const API_BASE = "http://localhost:5000/api";
const token = localStorage.getItem("token");

const transactionsBody = document.getElementById("transactionsBody");
const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const applyFilterBtn = document.getElementById("applyFilterBtn");

let allSales = [];

function money(n) {
  return Number(n || 0).toFixed(2);
}

function formatDate(d) {
  // d might be "2026-04-27T..." or "2026-04-27"
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d || "";
  return dt.toLocaleString();
}

function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "status-completed";
  if (s === "pending") return "status-pending";
  return "status-completed";
}

function renderRows(sales) {
  transactionsBody.innerHTML = "";

  if (!sales.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" style="color:#64748b; padding:20px;">No records found.</td>`;
    transactionsBody.appendChild(tr);
    return;
  }

  sales.forEach((s) => {
    const saleId = s.sale_id ?? s.id ?? "";
    const date = s.sale_date ?? s.date ?? "";
    const cashier = s.user_id ?? s.cashier ?? "";
    const total = s.total_amount ?? s.total ?? 0;
    const paymentMethod = s.payment_method ?? "";
    const status = s.status ?? "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${saleId}</td>
      <td>${formatDate(date)}</td>
      <td>${cashier}</td>
      <td>${money(total)}</td>
      <td>${paymentMethod}</td>
      <td><span class="status-pill ${statusClass(status)}">${status}</span></td>
      <td>
        <button type="button" class="btn-view" data-id="${saleId}">
          View
        </button>
      </td>
    `;
    transactionsBody.appendChild(tr);
  });

  // Optional: view details -> store last sale for receipt.html
  document.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const sale = allSales.find((x) => String(x.sale_id ?? x.id) === String(id));
      if (sale) {
        localStorage.setItem("lastSale", JSON.stringify(sale));
      }
      // If you have receipt.html implemented:
      window.location.href = "./receipt.html";
    });
  });
}

function applyDateFilter() {
  const fromVal = fromDateEl.value ? new Date(fromDateEl.value) : null;
  const toVal = toDateEl.value ? new Date(toDateEl.value) : null;

  const filtered = allSales.filter((s) => {
    const d = s.sale_date ?? s.date;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return false;

    if (fromVal && dt < fromVal) return false;
    if (toVal) {
      // include the whole "to" day
      const endOfDay = new Date(toVal);
      endOfDay.setHours(23, 59, 59, 999);
      if (dt > endOfDay) return false;
    }
    return true;
  });

  renderRows(filtered);
}

async function loadSales() {
  try {
    const res = await fetch(`${API_BASE}/sales`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    // Expected shape: { success: true, data: [...] }
    if (!res.ok || data.success === false) {
      throw new Error(data.message || "Failed to load sales");
    }

    const rows = data.data || data || [];
    allSales = Array.isArray(rows) ? rows : [];
    renderRows(allSales);
  } catch (err) {
    // Endpoint might not exist yet -> show mock table
    console.warn("GET /api/sales not available, using mock data:", err.message);

    allSales = [
      {
        sale_id: 1,
        sale_date: new Date().toISOString(),
        user_id: 2,
        total_amount: 433.44,
        payment_method: "cash",
        status: "completed",
      },
      {
        sale_id: 2,
        sale_date: new Date(Date.now() - 86400000).toISOString(),
        user_id: 2,
        total_amount: 220.00,
        payment_method: "cash",
        status: "completed",
      },
      {
        sale_id: 3,
        sale_date: new Date(Date.now() - 2 * 86400000).toISOString(),
        user_id: 3,
        total_amount: 120.50,
        payment_method: "cash",
        status: "pending",
      },
    ];

    renderRows(allSales);
  }
}

applyFilterBtn.addEventListener("click", () => {
  applyDateFilter();
});

loadSales();