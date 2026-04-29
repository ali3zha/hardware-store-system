Auth.requireAuth();
Auth.attachLogout("logoutLink");

const discountBody = document.getElementById("discountBody");
const discountMessage = document.getElementById("discountMessage");
const activeOnlyCheckbox = document.getElementById("activeOnlyCheckbox");
const reloadDiscountsBtn = document.getElementById("reloadDiscountsBtn");
const logoutLink = document.getElementById("logoutLink");

let allDiscounts = [];

logoutLink?.addEventListener("click", () => {
  window.API.clearAuth();
});

function safeDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatDiscountValue(type, value) {
  const num = Number(value || 0);
  const t = (type || "").toLowerCase();
  if (t === "percent" || t === "percentage") return `${num}%`;
  return `₱ ${num.toFixed(2)}`;
}

function statusClass(status = "") {
  const s = status.toLowerCase();
  if (s === "active") return "status-completed";
  if (s === "inactive") return "status-cancelled";
  return "status-pending";
}

function normalizeRow(raw) {
  return {
    name: raw.name ?? "-",
    type: raw.type ?? "-",
    value: raw.value ?? 0,
    valid_from: raw.valid_from ?? null,
    valid_until: raw.valid_until ?? null,
    status: raw.status ?? "inactive",
  };
}

function renderRows(rows) {
  discountBody.innerHTML = "";

  if (!rows.length) {
    discountBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:#64748b; padding:20px;">
          No discounts found.
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.type}</td>
      <td>${formatDiscountValue(row.type, row.value)}</td>
      <td>${safeDate(row.valid_from)}</td>
      <td>${safeDate(row.valid_until)}</td>
      <td><span class="status-pill ${statusClass(row.status)}">${row.status}</span></td>
    `;
    discountBody.appendChild(tr);
  });
}

function applyFilters() {
  let rows = [...allDiscounts];

  if (activeOnlyCheckbox.checked) {
    rows = rows.filter((d) => String(d.status).toLowerCase() === "active");
  }

  renderRows(rows);
  discountMessage.textContent = `Showing ${rows.length} discount(s).`;
}

async function loadDiscounts() {
  discountMessage.textContent = "Loading discounts...";

  try {
    // Try /discounts first
    const data = await window.API.get("/discounts");
    const rows = Array.isArray(data.data) ? data.data : [];
    allDiscounts = rows.map(normalizeRow);

    applyFilters();
    discountMessage.textContent = `Loaded ${allDiscounts.length} discount(s) from API.`;
  } catch (err1) {
    try {
      // fallback endpoint if backend supports active-only route
      const data2 = await window.API.get("/discounts/active");
      const rows2 = Array.isArray(data2.data) ? data2.data : [];
      allDiscounts = rows2.map(normalizeRow);

      applyFilters();
      discountMessage.textContent =
        "Loaded discounts from /api/discounts/active (fallback endpoint).";
    } catch (err2) {
      // final fallback mock data if endpoint not ready
      allDiscounts = [
        {
          name: "PWD",
          type: "percent",
          value: 10,
          valid_from: "2026-04-01",
          valid_until: "2026-06-30",
          status: "active",
        },
        {
          name: "Loyalty 50 OFF",
          type: "fixed",
          value: 50,
          valid_from: "2026-04-01",
          valid_until: "2026-12-31",
          status: "active",
        },
        {
          name: "Old Promo",
          type: "percent",
          value: 5,
          valid_from: "2025-01-01",
          valid_until: "2025-01-31",
          status: "inactive",
        },
      ];

      applyFilters();
      discountMessage.textContent =
        "Discount API not available yet. Showing temporary mock data.";
    }
  }
}

activeOnlyCheckbox.addEventListener("change", applyFilters);
reloadDiscountsBtn.addEventListener("click", loadDiscounts);

loadDiscounts();