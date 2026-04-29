(() => {
  Auth.requireAuth();
  Auth.attachLogout("logoutLink");

  const totalItemsEl = document.getElementById("totalItemsEl");
  const lowStocksEl = document.getElementById("lowStocksEl");
  const recentSalesEl = document.getElementById("recentSalesEl");
  const latestStockBody = document.getElementById("latestStockBody");
  const dashboardStatus = document.getElementById("dashboardStatus");

  function formatQty(type, qty) {
    const n = Number(qty || 0);
    return type === "in" ? `+${n}` : `-${n}`;
  }

  function movementLabel(type) {
    const t = String(type || "").toLowerCase();
    if (t === "in") return "Restocked";
    if (t === "out") return "Sale";
    return "Adjustment";
  }

  function movementClass(type) {
    const t = String(type || "").toLowerCase();
    return t === "in" ? "status-success" : "";
  }

  async function loadDashboard() {
    dashboardStatus.textContent = "Loading dashboard data...";

    try {
      const [productsRes, salesRes, movementsRes] = await Promise.all([
        API.get("/products"),
        API.get("/sales"),
        API.get("/stock-movements"),
      ]);

      const products = Array.isArray(productsRes.data) ? productsRes.data : [];
      const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
      const movements = Array.isArray(movementsRes.data) ? movementsRes.data : [];

      totalItemsEl.textContent = products.length.toLocaleString();
      lowStocksEl.textContent = products
        .filter((p) => Number(p.stock_qty) <= Number(p.reorder_level))
        .length.toLocaleString();
      recentSalesEl.textContent = sales.length.toLocaleString();

      latestStockBody.innerHTML = "";
      const latest = movements.slice(0, 5);
      if (!latest.length) {
        latestStockBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:#64748b;">No stock updates yet.</td></tr>';
      } else {
        latest.forEach((m) => {
          latestStockBody.innerHTML += `
            <tr>
              <td>
                <div><b>${m.product_name || `Product #${m.product_id}`}</b><br /><small>ID: #${m.product_id}</small></div>
              </td>
              <td>${m.category_name || "-"}</td>
              <td class="qty">${formatQty(m.type, m.quantity)}</td>
              <td><span class="status-tag ${movementClass(m.type)}">${movementLabel(m.type)}</span></td>
            </tr>
          `;
        });
      }

      dashboardStatus.textContent = "Dashboard synced from backend.";
    } catch (err) {
      dashboardStatus.textContent = err.message || "Failed to load dashboard.";
    }
  }

  loadDashboard();
})();
