const productApi = "/api/products";
const categoryApi = "/api/categories";
const supplierApi = "/api/suppliers";

const productTableBody = document.getElementById("productTableBody");
const productForm = document.getElementById("productForm");
const productError = document.getElementById("productError");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const supplierFilter = document.getElementById("supplierFilter");
const productCategory = document.getElementById("productCategory");
const productSupplier = document.getElementById("productSupplier");
const submitBtn = document.getElementById("submitBtn");

let products = [];
let editingId = null;

const productImages = [
  "https://images.unsplash.com/photo-1586864387917-f749f55939b7?w=120",
  "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=120",
  "https://images.unsplash.com/photo-1513467655676-561b7d489a88?w=120",
  "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=120",
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusTag(product) {
  const stock = Number(product.stock_qty ?? product.stock ?? 0);
  const low = Number(product.low_stock_threshold ?? product.lowThreshold ?? 10);
  if (stock <= low) {
    return '<span class="tag tag-low">Low Stock</span>';
  }
  return '<span class="tag tag-ok">In Stock</span>';
}

function getProductImage(product, index) {
  if (product.image_url) return product.image_url;
  return productImages[index % productImages.length];
}

function renderProducts() {
  const keyword = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const sup = supplierFilter.value;

  const filtered = products.filter((p) => {
    const name = String(p.name ?? "").toLowerCase();
    const categoryId = String(p.category_id ?? p.categoryId ?? "");
    const supplierId = String(p.supplier_id ?? p.supplierId ?? "");
    return (
      name.includes(keyword) &&
      (!cat || categoryId === cat) &&
      (!sup || supplierId === sup)
    );
  });

  productTableBody.innerHTML = filtered
    .map((p, index) => {
      const id = p.product_id ?? p.id;
      const name = p.name ?? "";
      const sku = p.sku ?? "";
      const category = p.category_name ?? p.category ?? "-";
      const supplier = p.supplier_name ?? p.supplier ?? "-";
      const price = Number(p.price ?? 0).toFixed(2);
      const stock = Number(p.stock_qty ?? p.stock ?? 0);
      const low = Number(p.low_stock_threshold ?? p.lowThreshold ?? 10);
      const rowClass = stock <= low ? "low-stock" : "";
      const image = getProductImage(p, index);

      return `
        <tr class="${rowClass}">
          <td>
            <div class="product-meta">
              <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" class="product-thumb">
              <div>
                <strong>${escapeHtml(name)}</strong><br>
                <span class="muted">ID: ${escapeHtml(id)}</span>
              </div>
            </div>
          </td>
          <td>${escapeHtml(sku)}</td>
          <td>${escapeHtml(category)}</td>
          <td>${escapeHtml(supplier)}</td>
          <td>PHP ${escapeHtml(price)}</td>
          <td>${escapeHtml(stock)}</td>
          <td>${statusTag(p)}</td>
          <td><button type="button" data-edit-id="${escapeHtml(id)}">Edit</button></td>
        </tr>
      `;
    })
    .join("");

  productTableBody.querySelectorAll("button[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => onEdit(btn.dataset.editId));
  });
}

function populateSelect(selectEl, rows, labelKey) {
  const current = selectEl.value;
  const defaultOption = selectEl.querySelector("option[value='']");
  selectEl.innerHTML = "";
  if (defaultOption) selectEl.appendChild(defaultOption);
  rows.forEach((row) => {
    const id = row.category_id ?? row.supplier_id ?? row.id;
    const label = row[labelKey] ?? row.name ?? "";
    const option = document.createElement("option");
    option.value = String(id);
    option.textContent = label;
    selectEl.appendChild(option);
  });
  selectEl.value = current;
}

async function fetchCategoriesAndSuppliers() {
  const [catRes, supRes] = await Promise.all([
    fetch(categoryApi),
    fetch(supplierApi),
  ]);
  if (!catRes.ok || !supRes.ok) throw new Error("Failed loading filters.");
  const categories = await catRes.json();
  const suppliers = await supRes.json();

  populateSelect(categoryFilter, categories, "name");
  populateSelect(productCategory, categories, "name");
  populateSelect(supplierFilter, suppliers, "name");
  populateSelect(productSupplier, suppliers, "name");
}

async function fetchProducts() {
  const res = await fetch(productApi);
  if (!res.ok) throw new Error("Failed to load products.");
  products = await res.json();
  renderProducts();
}

function onEdit(id) {
  const product = products.find((p) => String(p.product_id ?? p.id) === String(id));
  if (!product) return;

  editingId = product.product_id ?? product.id;
  document.getElementById("productName").value = product.name ?? "";
  document.getElementById("productSku").value = product.sku ?? "";
  document.getElementById("productPrice").value = product.price ?? 0;
  document.getElementById("productStock").value = product.stock_qty ?? product.stock ?? 0;
  document.getElementById("productLowThreshold").value = product.low_stock_threshold ?? 10;
  productCategory.value = String(product.category_id ?? product.categoryId ?? "");
  productSupplier.value = String(product.supplier_id ?? product.supplierId ?? "");
  submitBtn.textContent = "Update Product";
}

async function onSubmit(event) {
  event.preventDefault();
  productError.textContent = "";

  const payload = {
    name: document.getElementById("productName").value.trim(),
    sku: document.getElementById("productSku").value.trim(),
    price: Number(document.getElementById("productPrice").value),
    stock_qty: Number(document.getElementById("productStock").value),
    low_stock_threshold: Number(document.getElementById("productLowThreshold").value),
    category_id: Number(productCategory.value),
    supplier_id: Number(productSupplier.value),
  };

  try {
    const isEdit = Boolean(editingId);
    const url = isEdit ? `${productApi}/${editingId}` : productApi;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Save failed.");

    productForm.reset();
    editingId = null;
    submitBtn.textContent = "Add Product";
    await fetchProducts();
  } catch (error) {
    productError.textContent = error.message;
  }
}

function attachEvents() {
  productForm.addEventListener("submit", onSubmit);
  searchInput.addEventListener("input", renderProducts);
  categoryFilter.addEventListener("change", renderProducts);
  supplierFilter.addEventListener("change", renderProducts);
}

async function init() {
  try {
    await fetchCategoriesAndSuppliers();
    await fetchProducts();
    attachEvents();
  } catch (error) {
    productError.textContent = error.message;
  }
}

init();
