const movementApi = "/api/stock-movements";

const movementTableBody = document.getElementById("movementTableBody");
const movementError = document.getElementById("movementError");
const typeFilter = document.getElementById("typeFilter");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const filterBtn = document.getElementById("filterBtn");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

async function fetchMovements() {
  movementError.textContent = "";

  const params = new URLSearchParams();
  if (typeFilter.value) params.append("type", typeFilter.value);
  if (startDate.value) params.append("startDate", startDate.value);
  if (endDate.value) params.append("endDate", endDate.value);

  const url = params.toString() ? `${movementApi}?${params.toString()}` : movementApi;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load stock movements.");
  const rows = await res.json();

  movementTableBody.innerHTML = rows
    .map((row) => {
      const id = row.movement_id ?? row.id;
      const productId = row.product_id ?? "-";
      const productName = row.product_name ?? row.name ?? "-";
      return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(productId)}</td>
          <td>${escapeHtml(productName)}</td>
          <td>${escapeHtml(row.type ?? "-")}</td>
          <td>${escapeHtml(row.qty ?? row.quantity ?? "-")}</td>
          <td>${escapeHtml(row.reason ?? "-")}</td>
          <td>${escapeHtml(formatDate(row.moved_at))}</td>
        </tr>
      `;
    })
    .join("");
}

filterBtn.addEventListener("click", () => {
  fetchMovements().catch((error) => {
    movementError.textContent = error.message;
  });
});

fetchMovements().catch((error) => {
  movementError.textContent = error.message;
});
