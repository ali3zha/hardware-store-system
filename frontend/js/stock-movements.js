Auth.requireAuth();
Auth.attachLogout("logoutLink");

function renderMovementsTable(data) {
  const tableBody = document.getElementById("movementTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="8" class="empty">No stock movements found.</td></tr>`;
    return;
  }

  data.forEach(item => {
    const movementType = String(item.type || "").toLowerCase();
    const isPositive = movementType === "in";

    const typeTag =
      movementType === "in" ? "tag-ok" :
      movementType === "out" ? "tag-low" :
      "tag-adjust";

    const qtyColor = isPositive ? "#16a34a" : "#dc2626";
    const qtyIcon = isPositive ? "fa-arrow-up" : "fa-arrow-down";
    const status = movementType === "out" ? "completed" : movementType === "in" ? "pending" : "out-for-delivery";

    const row = `
      <tr>
        <td>#${item.movement_id}</td>
        <td>
          <div style="font-weight:700;">${item.product_name || "-"}</div>
          <small style="color:#94a3b8;">PID: ${item.product_id}</small>
        </td>
        <td><span class="tag ${typeTag}">${movementType.toUpperCase()}</span></td>
        <td style="color:${qtyColor}; font-weight:800;">
          <i class="fas ${qtyIcon}"></i> ${isPositive ? "+" : "-"}${item.quantity}
        </td>
        <td style="font-weight:800;">₱${Number(item.selling_price || 0).toLocaleString("en-PH",{minimumFractionDigits:2})}</td>
        <td>${item.reason || "-"}</td>
        <td><span class="status ${status}">${status}</span></td>
        <td>${new Date(item.moved_at).toLocaleString()}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  });
}

function filterMovements() {
  const searchText = document.getElementById("movementSearch").value.toLowerCase();
  const typeValue = document.getElementById("typeFilter").value;

  const filtered = window._movementsData.filter(item => {
    const matchesSearch =
      String(item.product_name || "").toLowerCase().includes(searchText) ||
      String(item.product_id || "").toLowerCase().includes(searchText) ||
      item.movement_id.toString().includes(searchText);

    const normalizedType = String(item.type || "").toLowerCase();
    const mappedType = normalizedType === "in" ? "Restock" : normalizedType === "out" ? "Sale" : "Adjustment";
    const matchesType = typeValue === "" || mappedType === typeValue;

    return matchesSearch && matchesType;
  });

  renderMovementsTable(filtered);
}

document.addEventListener("DOMContentLoaded", () => {
  window.API.get("/stock-movements")
    .then((res) => {
      window._movementsData = Array.isArray(res.data) ? res.data : [];
      renderMovementsTable(window._movementsData);
    })
    .catch(() => {
      window._movementsData = [];
      renderMovementsTable([]);
    });

  document.getElementById("movementSearch").addEventListener("input", filterMovements);
  document.getElementById("typeFilter").addEventListener("change", filterMovements);
});