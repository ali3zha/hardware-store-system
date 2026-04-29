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
const printBtn = document.getElementById("printBtn");

const receipt = loadLatestReceipt();

if (!receipt) {
itemsBody.innerHTML = `
<tr>
<td colspan="5" style="text-align:center;" class="muted">No receipt found. Checkout in POS first.</td>
</tr>
`;

saleIdText.textContent = "-";
dateTimeText.textContent = "-";
subtotalText.textContent = "PHP 0.00";
discountText.textContent = "PHP 0.00";
taxText.textContent = "PHP 0.00";
totalText.textContent = "PHP 0.00";
tenderedText.textContent = "PHP 0.00";
changeText.textContent = "PHP 0.00";
} else {
saleIdText.textContent = safeText(receipt.sale_id);
dateTimeText.textContent = safeText(receipt.date_time);

const items = Array.isArray(receipt.items) ? receipt.items : [];

itemsBody.innerHTML = items.length
? items.map((item) => {
const pid = item.product_id ?? "";
const name = item.name ?? "Item";
const qty = toNumber(item.qty, 0);
const price = toNumber(item.price, 0);
const lineTotal = qty * price;

return `
<tr>
<td>${escapeHtml(pid)}</td>
<td>${escapeHtml(name)}</td>
<td>${qty}</td>
<td>${money(price)}</td>
<td>${money(lineTotal)}</td>
</tr>
`;
}).join("")
: `
<tr>
<td colspan="5" style="text-align:center;" class="muted">No sold items.</td>
</tr>
`;

subtotalText.textContent = money(receipt.subtotal);
discountText.textContent = money(receipt.discount);
taxText.textContent = money(receipt.tax);
totalText.textContent = money(receipt.total);
tenderedText.textContent = money(receipt.amount_tendered);
changeText.textContent = money(receipt.change);
}

printBtn?.addEventListener("click", () => window.print());

function loadLatestReceipt() {
const fromSession = parseStorage(sessionStorage.getItem(STORAGE_LAST_KEY));
if (fromSession) return normalizeReceipt(fromSession);

const fromHistory = parseStorage(localStorage.getItem(STORAGE_HISTORY_KEY));
if (Array.isArray(fromHistory) && fromHistory.length > 0) {
return normalizeReceipt(fromHistory[0]);
}

return null;
}

function normalizeReceipt(raw) {
const items = Array.isArray(raw.items) ? raw.items : [];
const amountTendered = toNumber(raw.amount_tendered ?? raw.amountTendered ?? raw.payment, 0);
const total = toNumber(raw.total ?? raw.total_amount ?? raw.totalAmount, 0);
const change = toNumber(raw.change ?? raw.change_given ?? Math.max(0, amountTendered - total), 0);

return {
sale_id: raw.sale_id ?? raw.saleId ?? raw.id ?? "N/A",
date_time: raw.date_time ?? raw.datetime ?? raw.created_at ?? raw.sale_date ?? raw.date ?? new Date().toLocaleString(),
items: items.map((it) => ({
product_id: it.product_id ?? it.productId ?? it.id ?? "",
name: it.name ?? it.product_name ?? it.productName ?? "Item",
qty: toNumber(it.qty ?? it.quantity, 0),
price: toNumber(it.price ?? it.unit_price, 0),
})),
subtotal: toNumber(raw.subtotal, 0),
discount: toNumber(raw.discount ?? raw.discount_amount ?? raw.discountAmount, 0),
tax: toNumber(raw.tax ?? raw.tax_amount ?? raw.taxAmount, 0),
total,
amount_tendered: amountTendered,
change,
};
}

function parseStorage(value) {
if (!value) return null;

try {
return JSON.parse(value);
} catch {
return null;
}
}

function toNumber(value, fallback = 0) {
const n = Number(value);
return Number.isFinite(n) ? n : fallback;
}

function money(value) {
return `PHP ${toNumber(value, 0).toFixed(2)}`;
}

function escapeHtml(value) {
const div = document.createElement("div");
div.textContent = String(value ?? "");
return div.innerHTML;
}

function safeText(value) {
return String(value ?? "-");
}