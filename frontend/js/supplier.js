const supplierApi = "/api/suppliers";

const supplierTableBody = document.getElementById("supplierTableBody");
const supplierForm = document.getElementById("supplierForm");
const supplierError = document.getElementById("supplierError");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchSuppliers() {
  const res = await fetch(supplierApi);
  if (!res.ok) throw new Error("Failed to load suppliers.");
  const rows = await res.json();
  supplierTableBody.innerHTML = rows
    .map((row) => {
      const id = row.supplier_id ?? row.id;
      return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.contact_person ?? row.contact ?? "-")}</td>
          <td>${escapeHtml(row.phone ?? "-")}</td>
          <td>${escapeHtml(row.email ?? "-")}</td>
        </tr>
      `;
    })
    .join("");
}

async function onSubmit(event) {
  event.preventDefault();
  supplierError.textContent = "";
  const payload = {
    name: document.getElementById("supplierName").value.trim(),
    contact_person: document.getElementById("supplierContact").value.trim(),
    phone: document.getElementById("supplierPhone").value.trim(),
    email: document.getElementById("supplierEmail").value.trim(),
  };

  try {
    const res = await fetch(supplierApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add supplier.");
    supplierForm.reset();
    await fetchSuppliers();
  } catch (error) {
    supplierError.textContent = error.message;
  }
}

supplierForm.addEventListener("submit", onSubmit);
fetchSuppliers().catch((error) => {
  supplierError.textContent = error.message;
});
