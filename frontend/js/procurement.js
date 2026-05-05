(() => {
  Auth.requireAuth();
  Auth.attachLogout("logoutLink");

  const poForm = document.getElementById("poForm");
  const supplierIdEl = document.getElementById("supplierId");
  const createdByUserIdEl = document.getElementById("createdByUserId");
  const poItemsWrap = document.getElementById("poItemsWrap");
  const addItemBtn = document.getElementById("addItemBtn");
  const poFormStatus = document.getElementById("poFormStatus");
  const poTableBody = document.getElementById("poTableBody");
  const poTableStatus = document.getElementById("poTableStatus");

  let suppliers = [];
  let products = [];
  let users = [];
  let rowIdx = 0;
  let autoSyncRunning = false;
  const LOCAL_ORDER_TIMELINE_KEY = "stockOrderTimelineStart";
  let localTimelineStart = {};

  function setStatus(el, msg, isErr = false) {
    const text = String(msg || "").trim();
    el.textContent = text;
    if (!text) {
      el.className = "status";
      return;
    }
    el.className = isErr ? "status err" : "status ok";
  }

  function money(v) {
    return Number(v || 0).toFixed(2);
  }

  function loadTimelineMap() {
    try {
      const raw = localStorage.getItem(LOCAL_ORDER_TIMELINE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      localTimelineStart = parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      localTimelineStart = {};
    }
  }

  function saveTimelineMap() {
    localStorage.setItem(LOCAL_ORDER_TIMELINE_KEY, JSON.stringify(localTimelineStart));
  }

  function timelineElapsedSeconds(po) {
    const poId = Number(po?.po_id || 0);
    const localStart = poId ? Number(localTimelineStart[String(poId)] || 0) : 0;
    if (localStart > 0) {
      return Math.max(0, Math.floor((Date.now() - localStart) / 1000));
    }

    const t = new Date(po?.order_date || "");
    if (!isNaN(t.getTime())) {
      return Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
    }
    return 0;
  }

  function timelineStage(elapsedSec) {
    if (elapsedSec < 15) return "Preparing";
    if (elapsedSec < 30) return "Stock is on the way";
    if (elapsedSec < 40) return "Almost arrived";
    return "Received";
  }

  function trackingLabel(elapsedSec, qtyReceived, qtyOrdered) {
    if (qtyOrdered > 0 && qtyReceived >= qtyOrdered) return "Received";
    if (elapsedSec < 15) return "Preparing";
    if (elapsedSec < 30) return "Stock is on the way";
    if (elapsedSec < 40) return "Almost arrived";
    return "Auto receiving...";
  }

  async function autoAdvanceOrders(rows) {
    if (autoSyncRunning) return false;
    autoSyncRunning = true;
    try {
      let changed = false;
      for (const po of rows) {
        const qtyReceived = Number(po.total_qty_received || 0);
        const qtyOrdered = Number(po.total_qty_ordered || 0);
        if (qtyOrdered > 0 && qtyReceived >= qtyOrdered) continue;

        const elapsed = timelineElapsedSeconds(po);
        if (elapsed < 40) continue;

        const fallbackUser = Number(createdByUserIdEl.value || po.user_id || 0) || null;
        await API.post(`/purchase-orders/${po.po_id}/receive`, { user_id: fallbackUser, items: [] });
        const key = String(po.po_id);
        if (localTimelineStart[key]) {
          delete localTimelineStart[key];
          saveTimelineMap();
        }
        changed = true;
      }
      return changed;
    } finally {
      autoSyncRunning = false;
    }
  }

  function buildProductOptions() {
    const opts = ['<option value="">Select Product</option>'];
    products.forEach((p) => {
      opts.push(`<option value="${p.product_id}">${p.name} (Stock: ${p.stock_qty})</option>`);
    });
    return opts.join("");
  }

  function addItemRow() {
    const div = document.createElement("div");
    div.className = "po-item-row";
    div.style.marginBottom = "8px";
    div.dataset.row = String(rowIdx++);
    div.innerHTML = `
      <select class="po-product">${buildProductOptions()}</select>
      <input class="po-qty" type="number" min="1" step="1" placeholder="Qty Ordered" />
      <input class="po-cost" type="number" min="0" step="0.01" placeholder="Unit Cost" />
      <button type="button" class="btn-secondary po-remove-btn">Remove</button>
    `;
    poItemsWrap.appendChild(div);
    div.querySelector(".po-remove-btn")?.addEventListener("click", () => {
      const rows = Array.from(poItemsWrap.querySelectorAll(".po-item-row"));
      if (rows.length <= 1) {
        const productEl = div.querySelector(".po-product");
        const qtyEl = div.querySelector(".po-qty");
        const costEl = div.querySelector(".po-cost");
        if (productEl) productEl.value = "";
        if (qtyEl) qtyEl.value = "";
        if (costEl) costEl.value = "";
        return;
      }
      div.remove();
    });
  }

  function fillLookups() {
    supplierIdEl.innerHTML = '<option value="">Select Supplier</option>';
    suppliers.forEach((s) => {
      supplierIdEl.innerHTML += `<option value="${s.supplier_id}">${s.name}</option>`;
    });

    createdByUserIdEl.innerHTML = '<option value="">Created By (User)</option>';
    users.forEach((u) => {
      createdByUserIdEl.innerHTML += `<option value="${u.user_id}">${u.full_name} (${u.role})</option>`;
    });

    if (!poItemsWrap.children.length) addItemRow();
  }

  function extractItemsFromForm() {
    const rows = Array.from(poItemsWrap.children);
    return rows
      .map((row) => ({
        product_id: Number(row.querySelector(".po-product")?.value || 0),
        qty_ordered: Number(row.querySelector(".po-qty")?.value || 0),
        unit_cost: Number(row.querySelector(".po-cost")?.value || 0),
      }))
      .filter((x) => x.product_id > 0 && x.qty_ordered > 0 && x.unit_cost >= 0);
  }

  async function loadLookups() {
    try {
      const [supRes, prodRes, meRes] = await Promise.all([
        API.get("/suppliers"),
        API.get("/products"),
        API.get("/auth/me"),
      ]);
      suppliers = Array.isArray(supRes.data) ? supRes.data : [];
      products = Array.isArray(prodRes.data) ? prodRes.data : [];

      const me = meRes.data || {};
      users = [
        {
          user_id: me.user_id,
          full_name: me.full_name || me.username || `User #${me.user_id || ""}`,
          role: me.role || "staff",
        },
      ];
      fillLookups();
      if (me.user_id) createdByUserIdEl.value = String(me.user_id);
    } catch (err) {
      setStatus(poFormStatus, err.message || "Failed to load lookup data.", true);
    }
  }

  async function loadPurchaseOrders(forceFresh = false) {
    setStatus(poTableStatus, "Loading stock order records...");
    try {
      let res = await API.get("/purchase-orders", forceFresh ? { cache: "no-store" } : {});
      let rows = Array.isArray(res.data) ? res.data : [];

      const changed = await autoAdvanceOrders(rows);
      if (changed) {
        res = await API.get("/purchase-orders", { cache: "no-store" });
        rows = Array.isArray(res.data) ? res.data : [];
      }

      poTableBody.innerHTML = "";

      if (!rows.length) {
        poTableBody.innerHTML = '<tr><td colspan="7" class="empty">No stock orders yet.</td></tr>';
      } else {
        rows.forEach((po) => {
          const qtyReceived = Number(po.total_qty_received || 0);
          const qtyOrdered = Number(po.total_qty_ordered || 0);
          const elapsed = timelineElapsedSeconds(po);
          const stage = timelineStage(elapsed);
          poTableBody.innerHTML += `
            <tr>
              <td>#${po.po_id}</td>
              <td>${po.supplier_name || po.supplier_id}</td>
              <td>${po.order_date ? new Date(po.order_date).toLocaleDateString() : "-"}</td>
              <td>${qtyOrdered > 0 && qtyReceived >= qtyOrdered ? "Received" : stage}</td>
              <td>${money(po.total_cost)}</td>
              <td>+${qtyReceived} / ${qtyOrdered}</td>
              <td>${trackingLabel(elapsed, qtyReceived, qtyOrdered)}</td>
            </tr>
          `;
        });
      }

      setStatus(poTableStatus, `Loaded ${rows.length} stock order(s).`);
    } catch (err) {
      setStatus(poTableStatus, err.message || "Failed to load stock order records.", true);
    }
  }

  async function submitPurchaseOrder() {
    const supplier_id = Number(supplierIdEl.value || 0);
    const user_id = Number(createdByUserIdEl.value || 0);
    const items = extractItemsFromForm();

    if (!supplier_id || !user_id || !items.length) {
      return false;
    }

    const createRes = await API.post("/purchase-orders", { supplier_id, user_id, items });
    const newPoId = createRes?.po_id || createRes?.data?.po_id;
    if (newPoId) {
      localTimelineStart[String(newPoId)] = Date.now();
      saveTimelineMap();
    }
    setStatus(
      poFormStatus,
      newPoId ? `Stock order #${newPoId} created successfully.` : "Stock order created successfully."
    );
    poItemsWrap.innerHTML = "";
    addItemRow();
    await loadPurchaseOrders(true);
    return true;
  }

  addItemBtn.addEventListener("click", async () => {
    try {
      // If form has valid details, save directly and reflect in Stock Order Records table.
      const saved = await submitPurchaseOrder();
      if (saved) return;

      // Do not auto-add blank rows; require completing current row first.
      setStatus(
        poFormStatus,
        "Please complete supplier, user, and at least one full item row (Product, Qty, Unit Cost) before creating a stock order.",
        true
      );
    } catch (err) {
      setStatus(poFormStatus, err.message || "Failed to create stock order.", true);
    }
  });

  poForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const saved = await submitPurchaseOrder();
      if (!saved) {
        return setStatus(poFormStatus, "Please complete supplier, user, and at least one item.", true);
      }
    } catch (err) {
      setStatus(poFormStatus, err.message || "Failed to create stock order.", true);
    }
  });

  (async function init() {
    loadTimelineMap();
    await loadLookups();
    await loadPurchaseOrders();
    window.setInterval(() => {
      loadPurchaseOrders(true).catch(() => {});
    }, 5000);
  })();
})();
