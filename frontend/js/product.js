(() => {
  Auth.requireAuth();
  Auth.attachLogout("logoutLink");

  const form = document.getElementById("productForm");
  const saveBtn = document.getElementById("saveBtn");
  const formStatus = document.getElementById("formStatus");
  const tableStatus = document.getElementById("tableStatus");

  const nameEl = document.getElementById("name");
  const skuEl = document.getElementById("sku");
  const priceEl = document.getElementById("price");
  const stockEl = document.getElementById("stock");
  const reorderEl = document.getElementById("reorder");
  const categoryEl = document.getElementById("categoryId");
  const supplierEl = document.getElementById("supplierId");

  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const supplierFilter = document.getElementById("supplierFilter");
  const resetFilterBtn = document.getElementById("resetFilterBtn");

  const tbody = document.getElementById("productTableBody");

  let products = [];
  let categories = [];
  let suppliers = [];
  let editingId = null;

  function setStatus(el, msg, isErr = false) {
    el.textContent = msg || "";
    el.className = isErr ? "status err" : "status ok";
  }

  function formatMoney(v) {
    return Number(v || 0).toFixed(2);
  }

  function stockStatus(product) {
    const low = Number(product.stock_qty) <= Number(product.reorder_level);
    return low
      ? '<span class="badge err">Low Stock</span>'
      : '<span class="badge ok">In Stock</span>';
  }

  function fillDropdowns() {
    categoryEl.innerHTML = `<option value="">Select Category</option>`;
    categoryFilter.innerHTML = `<option value="">All Categories</option>`;
    categories.forEach((c) => {
      categoryEl.innerHTML += `<option value="${c.category_id}">${c.name}</option>`;
      categoryFilter.innerHTML += `<option value="${c.category_id}">${c.name}</option>`;
    });

    supplierEl.innerHTML = `<option value="">Select Supplier</option>`;
    supplierFilter.innerHTML = `<option value="">All Suppliers</option>`;
    suppliers.forEach((s) => {
      supplierEl.innerHTML += `<option value="${s.supplier_id}">${s.name}</option>`;
      supplierFilter.innerHTML += `<option value="${s.supplier_id}">${s.name}</option>`;
    });
  }

  function renderTable() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const sup = supplierFilter.value;

    const filtered = products.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();

      const bySearch = !q || name.includes(q) || sku.includes(q);
      const byCat = !cat || String(p.category_id) === String(cat);
      const bySup = !sup || String(p.supplier_id) === String(sup);

      return bySearch && byCat && bySup;
    });

    tbody.innerHTML = "";
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">No products found.</td></tr>`;
      return;
    }

    filtered.forEach((p) => {
      const row = document.createElement("tr");
      if (Number(p.stock_qty) <= Number(p.reorder_level)) row.classList.add("low-row");

      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.sku}</td>
        <td>${p.category_name || p.category_id}</td>
        <td>${formatMoney(p.selling_price)}</td>
        <td>${p.stock_qty}</td>
        <td>${stockStatus(p)}</td>
        <td><button class="btn-outline edit-btn" data-id="${p.product_id}">Edit</button></td>
      `;
      tbody.appendChild(row);
    });

    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const p = products.find((x) => Number(x.product_id) === id);
        if (!p) return;

        editingId = id;
        nameEl.value = p.name || "";
        skuEl.value = p.sku || "";
        priceEl.value = p.selling_price || 0;
        stockEl.value = p.stock_qty || 0;
        reorderEl.value = p.reorder_level || 10;
        categoryEl.value = p.category_id || "";
        supplierEl.value = p.supplier_id || "";
        saveBtn.textContent = "Update Product";
        setStatus(formStatus, "Editing product...");
      });
    });
  }

  async function loadLookups() {
    try {
      const [catRes, supRes] = await Promise.all([
        API.get("/categories"),
        API.get("/suppliers"),
      ]);

      categories = catRes.data || [];
      suppliers = supRes.data || [];
      fillDropdowns();
    } catch {
      // fallback if endpoints not yet available
      categories = [];
      suppliers = [];
      fillDropdowns();
    }
  }

  async function loadProducts() {
    setStatus(tableStatus, "Loading products...");
    try {
      const res = await API.get("/products");
      products = res.data || [];
      renderTable();
      setStatus(tableStatus, `Loaded ${products.length} product(s).`);
    } catch (err) {
      setStatus(tableStatus, err.message || "Failed to load products.", true);
    }
  }

  function clearForm() {
    form.reset();
    reorderEl.value = 10;
    editingId = null;
    saveBtn.textContent = "Save Product";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: nameEl.value.trim(),
      sku: skuEl.value.trim(),
      category_id: Number(categoryEl.value),
      supplier_id: Number(supplierEl.value),
      selling_price: Number(priceEl.value),
      stock_qty: Number(stockEl.value),
      reorder_level: Number(reorderEl.value),
      status: "active",
      // optional fields expected by your BE2 insert query
      barcode: null,
      cost_price: Number(priceEl.value),
      unit: "pc",
    };

    try {
      if (editingId) {
        await API.put(`/products/${editingId}`, payload);
        setStatus(formStatus, "Product updated successfully.");
      } else {
        await API.post("/products", payload);
        setStatus(formStatus, "Product added successfully.");
      }

      clearForm();
      await loadProducts();
    } catch (err) {
      setStatus(formStatus, err.message || "Failed to save product.", true);
    }
  });

  searchInput.addEventListener("input", renderTable);
  categoryFilter.addEventListener("change", renderTable);
  supplierFilter.addEventListener("change", renderTable);

  resetFilterBtn.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    supplierFilter.value = "";
    renderTable();
  });

  (async function init() {
    await loadLookups();
    await loadProducts();
  })();
})();