const categoryApi = "/api/categories";

const categoryTableBody = document.getElementById("categoryTableBody");
const categoryForm = document.getElementById("categoryForm");
const categoryError = document.getElementById("categoryError");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchCategories() {
  const res = await fetch(categoryApi);
  if (!res.ok) throw new Error("Failed to load categories.");
  const rows = await res.json();
  categoryTableBody.innerHTML = rows
    .map((row) => {
      const id = row.category_id ?? row.id;
      return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.description ?? "-")}</td>
        </tr>
      `;
    })
    .join("");
}

async function onSubmit(event) {
  event.preventDefault();
  categoryError.textContent = "";
  const payload = {
    name: document.getElementById("categoryName").value.trim(),
    description: document.getElementById("categoryDescription").value.trim(),
  };

  try {
    const res = await fetch(categoryApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add category.");
    categoryForm.reset();
    await fetchCategories();
  } catch (error) {
    categoryError.textContent = error.message;
  }
}

categoryForm.addEventListener("submit", onSubmit);
fetchCategories().catch((error) => {
  categoryError.textContent = error.message;
});
