(() => {
  const STORAGE_KEY = "hardwareStoreCustomers";

  const form = document.getElementById("customerForm");
  const customerIdInput = document.getElementById("customerId");
  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");
  const addressInput = document.getElementById("address");
  const submitBtn = document.getElementById("submitBtn");
  const clearBtn = document.getElementById("clearBtn");
  const formTitle = document.getElementById("formTitle");
  const tableBody = document.getElementById("customerTableBody");
  const searchInput = document.getElementById("searchInput");
  const emptyState = document.getElementById("emptyState");
  const message = document.getElementById("message");

  // Exit quietly if this script is loaded outside customer page.
  if (
    !form ||
    !customerIdInput ||
    !fullNameInput ||
    !phoneInput ||
    !emailInput ||
    !addressInput ||
    !submitBtn ||
    !clearBtn ||
    !formTitle ||
    !tableBody ||
    !searchInput ||
    !emptyState ||
    !message
  ) {
    return;
  }

  let customers = loadCustomers();
  let searchText = "";

  renderCustomers();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const customerData = {
      id: customerIdInput.value || crypto.randomUUID(),
      fullName: fullNameInput.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      address: addressInput.value.trim()
    };

    if (!customerData.fullName || !customerData.phone || !customerData.email || !customerData.address) {
      showMessage("Please complete all fields.", true);
      return;
    }

    if (!isValidEmail(customerData.email)) {
      showMessage("Please enter a valid email address.", true);
      return;
    }

    if (customerIdInput.value) {
      customers = customers.map((customer) =>
        customer.id === customerData.id ? customerData : customer
      );
      showMessage("Customer updated successfully.");
    } else {
      customers.push(customerData);
      showMessage("Customer added successfully.");
    }

    saveCustomers(customers);
    resetForm();
    renderCustomers();
  });

  clearBtn.addEventListener("click", () => {
    resetForm();
    showMessage("");
  });

  searchInput.addEventListener("input", (event) => {
    searchText = event.target.value.toLowerCase().trim();
    renderCustomers();
  });

  tableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    const selectedCustomer = customers.find((customer) => customer.id === id);
    if (!selectedCustomer) return;

    if (action === "edit") {
      customerIdInput.value = selectedCustomer.id;
      fullNameInput.value = selectedCustomer.fullName;
      phoneInput.value = selectedCustomer.phone;
      emailInput.value = selectedCustomer.email;
      addressInput.value = selectedCustomer.address;
      formTitle.textContent = "Edit Customer";
      submitBtn.textContent = "Update Customer";
      fullNameInput.focus();
      showMessage("");
    }

    if (action === "delete") {
      const shouldDelete = confirm(`Delete customer "${selectedCustomer.fullName}"?`);
      if (!shouldDelete) return;

      customers = customers.filter((customer) => customer.id !== id);
      saveCustomers(customers);
      renderCustomers();
      showMessage("Customer deleted successfully.");

      if (customerIdInput.value === id) {
        resetForm();
      }
    }
  });

  function renderCustomers() {
    tableBody.innerHTML = "";

    const filtered = customers.filter((customer) => {
      const target = `${customer.fullName} ${customer.phone} ${customer.email} ${customer.address}`.toLowerCase();
      return target.includes(searchText);
    });

    filtered.forEach((customer) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(customer.fullName)}</td>
        <td>${escapeHtml(customer.phone)}</td>
        <td>${escapeHtml(customer.email)}</td>
        <td>${escapeHtml(customer.address)}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-action="edit" data-id="${customer.id}" class="secondary">Edit</button>
            <button type="button" data-action="delete" data-id="${customer.id}" class="danger">Delete</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

    emptyState.style.display = filtered.length ? "none" : "block";
  }

  function resetForm() {
    form.reset();
    customerIdInput.value = "";
    formTitle.textContent = "Add Customer";
    submitBtn.textContent = "Save Customer";
  }

  function loadCustomers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveCustomers(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#dc2626" : "#16a34a";
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }
})();
