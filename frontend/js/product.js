function renderProducts() {
  const keyword = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const filtered = products.filter((p) => {
    const name = String(p.name ?? "").toLowerCase();
    const categoryId = String(p.category_id ?? p.categoryId ?? "");
    return (name.includes(keyword) && (!cat || categoryId === cat));
  });

  productTableBody.innerHTML = filtered.map((p, index) => {
    const price = Number(p.price ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2});
    const stock = Number(p.stock_qty ?? p.stock ?? 0);
    const low = Number(p.low_stock_threshold ?? 10);
    const rowClass = stock <= low ? "low-stock" : "";
    const image = p.image_url || productImages[index % productImages.length];

    return `
      <tr class="${rowClass}">
        <td>
          <div class="product-meta">
            <img src="${image}" class="product-thumb">
            <div>
              <strong>${escapeHtml(p.name)}</strong><br>
              <small class="muted">ID: ${p.id}</small>
            </div>
          </div>
        </td>
        <td>${escapeHtml(p.sku)}</td>
        <td>${escapeHtml(p.category_name || p.category)}</td>
        <td style="font-weight: bold;">₱${price}</td>
        <td style="${stock <= low ? 'color: #ee4d2d; font-weight: bold;' : ''}">${stock}</td>
        <td>${statusTag(p)}</td>
        <td>
          <button class="btn-secondary" onclick="onEdit('${p.id}')" style="padding: 5px 10px;">Edit</button>
        </td>
      </tr>
    `;
  }).join("");
}