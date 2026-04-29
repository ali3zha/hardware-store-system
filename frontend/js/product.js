const form = document.getElementById("productForm");
const submitBtn = document.getElementById("submitBtn");

const nameEl = document.getElementById("productName");
const skuEl = document.getElementById("productSku");
const priceEl = document.getElementById("productPrice");
const stockEl = document.getElementById("productStock");
const thresholdEl = document.getElementById("productLowThreshold");
const categoryEl = document.getElementById("productCategory");
const supplierEl = document.getElementById("productSupplier");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const supplierFilter = document.getElementById("supplierFilter");
const resetFilterBtn = document.getElementById("resetFilterBtn");

const tableBody = document.getElementById("productTableBody");
const msgEl = document.getElementById("productMsg");

let products = [];
let categories = [];
let suppliers = [];
let editId = null;

function showMsg(text, isError = false) {
  msgEl.textContent = text;
  msgEl.style.color = isError ? "#dc2626" : "#15803d";
}

function money(v) {
  return Number(v || 0).toFixed(2);
}

function statusLabel(stock, reorderLevel) {
  return Number(stock) <= Number(reorderLevel) ? "Low Stock" : "In Stock";
}

function fillCategoryOptions() {
  categoryEl.innerHTML = `<option value="">Category</option>`;
  categoryFilter.innerHTML = `<option value="">All Categories</option>`;

  categories.forEach((c) => {
    categoryEl.innerHTML += `<option value="${c.category_id}">${c.name}</option>`;
    categoryFilter.innerHTML += `<option value="${c.category_id}">${c.name}</option>`;
  });
}

function fillSupplierOptions() {
  supplierEl.innerHTML = `<option value="">Supplier</option>`;
  supplierFilter.innerHTML = `<option value="">All Suppliers</option>`;

  suppliers.forEach((s) => {
    supplierEl.innerHTML += `<option value="${s.supplier_id}">${s.name}</option>`;
    supplierFilter.innerHTML += `<option value="${s.supplier_id}">${s.name}</option>`;
  });
}

function renderTable(list) {
  tableBody.innerHTML = "";

  if (!list.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:18px; color:#64748b;">No products found.</td>
      </tr>
    `;
    return;
  }

  list.forEach((p) => {
    const low = Number(p.stock_qty) <= Number(p.reorder_level);
    const status = statusLabel(p.stock_qty, p.reorder_level);

    const tr = document.createElement("tr");
    if (low) tr.style.background = "#fff7ed";

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.sku || "-"}</td>
      <td>${p.category_name || p.category_id || "-"}</td>
      <td>${money(p.selling_price)}</td>
      <td>${p.stock_qty}</td>
      <td>
        <span class="${low ? "status-low" : "status-ok"}">${status}</span>
      </td>
      <td>
        <button type="button" class="edit-btn" data-id="${p.product_id}">Edit</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const p = products.find((x) => Number(x.product_id) === id);
      if (!p) return;

      editId = id;
      submitBtn.textContent = "Update Product";

      nameEl.value = p.name || "";
      skuEl.value = p.sku || "";
      priceEl.value = p.selling_price || "";
      stockEl.value = p.stock_qty || "";
      thresholdEl.value = p.reorder_level || 10;
      categoryEl.value = p.category_id || "";
      supplierEl.value = p.supplier_id || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const sup = supplierFilter.value;

  const filtered = products.filter((p) => {
    const matchSearch =
      !q ||
      String(p.name || "").toLowerCase().includes(q) ||
      String(p.sku || "").toLowerCase().includes(q);

    const matchCat = !cat || String(p.category_id) === String(cat);
    const matchSup = !sup || String(p.supplier_id) === String(sup);

    return matchSearch && matchCat && matchSup;
  });

  renderTable(filtered);
}

async function loadProducts() {
  const data = await window.API.get("/products");
  products = Array.isArray(data.data) ? data.data : [];
  applyFilters();
}

async function loadCategories() {
  try {
    const data = await window.API.get("/categories");
    categories = Array.isArray(data.data) ? data.data : [];
  } catch {
    categories = [];
  }
  fillCategoryOptions();
}

async function loadSuppliers() {
  try {
    const data = await window.API.get("/suppliers");
    suppliers = Array.isArray(data.data) ? data.data : [];
  } catch {
    suppliers = [];
  }
  fillSupplierOptions();
}

function resetForm() {
  form.reset();
  thresholdEl.value = 10;
  editId = null;
  submitBtn.textContent = "Save Product";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: nameEl.value.trim(),
    sku: skuEl.value.trim(),
    selling_price: Number(priceEl.value || 0),
    stock_qty: Number(stockEl.value || 0),
    reorder_level: Number(thresholdEl.value || 10),
    category_id: Number(categoryEl.value),
    supplier_id: Number(supplierEl.value),
    status: "active",
    // optional backend fields
    barcode: null,
    cost_price: Number(priceEl.value || 0),
    unit: "pc",
  };

  try {
    if (editId) {
      await window.API.put(`/products/${editId}`, payload); // PUT /api/products/:id
      showMsg("Product updated successfully.");
    } else {
      await window.API.post("/products", payload); // POST /api/products
      showMsg("Product added successfully.");
    }

    resetForm();
    await loadProducts();
  } catch (err) {
    showMsg(err.message || "Failed to save product.", true);
  }
});

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
supplierFilter.addEventListener("change", applyFilters);

resetFilterBtn.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "";
  supplierFilter.value = "";
  applyFilters();
});

(async function init() {
  try {
    await Promise.all([loadCategories(), loadSuppliers()]);
    await loadProducts();
  } catch (err) {
    showMsg(err.message || "Failed to load product page data.", true);
  }
})();