(() => {
  Auth.requireAuth();
  Auth.attachLogout("logoutLink");

  const gridEl = document.querySelector(".category-grid");
  const tableTitle = document.getElementById("tableTitle");
  const body = document.getElementById("inventoryBody");

  let products = [];
  let activeCategory = "All";

  function money(v) {
    return Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });
  }

  function renderCategories(categories) {
    if (!gridEl) return;
    gridEl.innerHTML = "";
    const iconByCategory = {
      "All Items": "fas fa-list",
      Paints: "fas fa-paint-roller",
      "Hand Tools": "fas fa-hammer",
      "Power Tools": "fas fa-bolt",
      Electrical: "fas fa-plug",
      Plumbing: "fas fa-faucet",
    };

    const allCard = document.createElement("div");
    allCard.className = "cat-card";
    allCard.innerHTML = `<i class="${iconByCategory["All Items"]}"></i><h4>All Items</h4>`;
    allCard.addEventListener("click", () => {
      activeCategory = "All";
      renderTable();
    });
    gridEl.appendChild(allCard);

    categories.forEach((c) => {
      const card = document.createElement("div");
      card.className = "cat-card";
      const iconClass = iconByCategory[c.name] || "fas fa-layer-group";
      card.innerHTML = `<i class="${iconClass}"></i><h4>${c.name}</h4>`;
      card.addEventListener("click", () => {
        activeCategory = c.name;
        renderTable();
      });
      gridEl.appendChild(card);
    });
  }

  function renderTable() {
    const filtered =
      activeCategory === "All"
        ? products
        : products.filter((p) => p.category_name === activeCategory);

    tableTitle.textContent = `Showing: ${activeCategory === "All" ? "All Items" : activeCategory}`;
    body.innerHTML = "";

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="4" class="empty">No products found.</td></tr>`;
      return;
    }

    filtered.forEach((p) => {
      const statusClass = Number(p.stock_qty) <= Number(p.reorder_level) ? "tag-low" : "tag-ok";
      body.innerHTML += `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.category_name || "-"}</td>
          <td><span class="tag ${statusClass}">${p.stock_qty} pcs</span></td>
          <td style="font-weight:700;">₱${money(p.selling_price)}</td>
        </tr>
      `;
    });
  }

  async function init() {
    const [catRes, prodRes] = await Promise.all([
      window.API.get("/categories"),
      window.API.get("/products"),
    ]);
    renderCategories(catRes.data || []);
    products = prodRes.data || [];
    renderTable();
  }

  init().catch(() => {
    body.innerHTML = `<tr><td colspan="4" class="empty">Failed to load category data.</td></tr>`;
  });
})();