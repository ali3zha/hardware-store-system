Auth.requireAuth();
Auth.attachLogout("logoutLink");

const customerTableBody = document.getElementById("customerTableBody");
const customerMsg = document.getElementById("customerMsg");
const searchInput = document.getElementById("searchInput");
const reloadBtn = document.getElementById("reloadBtn");
const fullNameEl = document.getElementById("fullName");
const phoneEl = document.getElementById("phone");
const emailEl = document.getElementById("email");
const addCustomerBtn = document.getElementById("addCustomerBtn");
const logoutLink = document.getElementById("logoutLink");

let allCustomers = [];

logoutLink?.addEventListener("click", () => {
  window.API.clearAuth();
});

function renderRows(rows) {
  customerTableBody.innerHTML = "";

  if (!rows.length) {
    customerTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No customers found.</td></tr>`;
    return;
  }

  rows.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.full_name || ""}</td>
      <td>${c.phone || ""}</td>
      <td>${c.email || ""}</td>
      <td>${Number(c.loyalty_points || 0)}</td>
    `;
    customerTableBody.appendChild(tr);
  });
}

function applySearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderRows(allCustomers);

  const filtered = allCustomers.filter((c) =>
    (c.full_name || "").toLowerCase().includes(q) ||
    (c.phone || "").toLowerCase().includes(q)
  );

  renderRows(filtered);
}

async function loadCustomers() {
  customerMsg.textContent = "Loading customers...";
  customerMsg.style.color = "#64748b";

  try {
    const res = await window.API.get("/customers");
    allCustomers = Array.isArray(res.data) ? res.data : [];
    renderRows(allCustomers);
    customerMsg.textContent = `Loaded ${allCustomers.length} customer(s).`;
  } catch (err) {
    customerMsg.style.color = "#dc2626";
    customerMsg.textContent = err.message;
  }
}

async function addCustomer() {
  const full_name = fullNameEl.value.trim();
  const phone = phoneEl.value.trim();
  const email = emailEl.value.trim();

  if (!full_name || !phone) {
    customerMsg.style.color = "#dc2626";
    customerMsg.textContent = "Full name and phone are required.";
    return;
  }

  try {
    await window.API.post("/customers", { full_name, phone, email });
    customerMsg.style.color = "#15803d";
    customerMsg.textContent = "Customer added successfully.";
    fullNameEl.value = "";
    phoneEl.value = "";
    emailEl.value = "";
    await loadCustomers();
  } catch (err) {
    customerMsg.style.color = "#dc2626";
    customerMsg.textContent = err.message;
  }
}

searchInput.addEventListener("input", applySearch);
reloadBtn.addEventListener("click", loadCustomers);
addCustomerBtn.addEventListener("click", addCustomer);

loadCustomers();