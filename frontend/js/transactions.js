Auth.requireAuth();
Auth.attachLogout("logoutLink");

const transactionsBody = document.getElementById("transactionsBody");
const txMessage = document.getElementById("txMessage");
const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const resetFilterBtn = document.getElementById("resetFilterBtn");

let allTransactions = [];

function money(v) {
return Number(v || 0).toFixed(2);
}

function safeDate(value) {
if (!value) return "";
const d = new Date(value);
if (Number.isNaN(d.getTime())) return value;
return d.toLocaleString();
}

function statusClass(status = "") {
const s = String(status).toLowerCase();

if (s === "completed") return "status-completed";
if (s === "pending") return "status-pending";
if (s === "cancelled" || s === "voided" || s === "refunded") return "status-cancelled";

return "status-pending";
}

function normalizeRow(raw) {
return {
sale_id: raw.sale_id ?? raw.id ?? "",
sale_date: raw.sale_date ?? raw.date ?? raw.created_at ?? "",
user_display:
raw.user_name ??
raw.cashier ??
raw.full_name ??
(raw.user_id ? `User #${raw.user_id}` : "N/A"),
total_amount: raw.total_amount ?? raw.totalAmount ?? raw.total ?? 0,
payment_method: raw.payment_method ?? "cash",
status: raw.status ?? "pending",
raw,
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

transactionsBody.querySelectorAll(".details-btn").forEach((btn) => {
btn.addEventListener("click", () => {
const id = btn.dataset.id;
const tx = allTransactions.find((t) => String(t.sale_id) === String(id));
if (!tx) return;

alert(
`Sale ID: ${tx.sale_id}
Date: ${safeDate(tx.sale_date)}
Cashier: ${tx.user_display}
Total: ₱ ${money(tx.total_amount)}
Payment: ${tx.payment_method}
Status: ${tx.status}`
);
});
});
}

function applyDateFilter() {
const from = fromDateEl.value ? new Date(fromDateEl.value) : null;
const to = toDateEl.value ? new Date(toDateEl.value) : null;

const filtered = allTransactions.filter((row) => {
if (!row.sale_date) return false;

const d = new Date(row.sale_date);
if (Number.isNaN(d.getTime())) return false;

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
const data = await API.get("/sales");
const rows = Array.isArray(data.data) ? data.data : [];

allTransactions = rows.map(normalizeRow);
renderRows(allTransactions);

txMessage.textContent = `Loaded ${allTransactions.length} transaction(s).`;
} catch (err) {
transactionsBody.innerHTML = `
<tr>
<td colspan="7" style="text-align:center; color:#b91c1c; padding:20px;">
${err.message || "Failed to load transactions."}
</td>
</tr>
`;

txMessage.textContent = "Could not load sales from API.";
}
}

applyFilterBtn.addEventListener("click", applyDateFilter);
resetFilterBtn.addEventListener("click", resetFilters);

loadTransactions();