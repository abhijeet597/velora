// Order history page. Cart, toast, money and order storage come from cart.js (loaded first).

// Status comes from order age at render time (no timers).
//   age <  shipped              -> Processing
//   shipped <= age <= delivered -> Shipped
//   age >  delivered            -> Delivered
const ORDER_STATUS_AGE_MS = { shipped: 60 * 1000, delivered: 3 * 60 * 1000 };
const ORDER_STATUS_LIST = ["Processing", "Shipped", "Delivered"];

// ---------- Elements ----------
const ordersListEl = document.getElementById("orders-list");
const ordersCountEl = document.getElementById("orders-count");
const ordersToolbarEl = document.getElementById("orders-toolbar");
const statusChipsEl = document.getElementById("status-chips");
const orderSearchEl = document.getElementById("order-search");
const ordersEmptyEl = document.getElementById("orders-empty");
const ordersNoMatchEl = document.getElementById("orders-nomatch");
const statCountEl = document.getElementById("stat-count");
const statSpentEl = document.getElementById("stat-spent");
const clearBtn = document.getElementById("clear-history");
const confirmBarEl = document.getElementById("confirm-bar");
const confirmCancelBtn = document.getElementById("confirm-cancel");
const confirmYesBtn = document.getElementById("confirm-yes");
const resetFiltersBtn = document.getElementById("reset-filters");

// ---------- State ----------
let statusFilter = "All";

// ---------- Helpers ----------
function orderStatus(order, now = Date.now()) {
  const created = Date.parse(order.createdAt);
  if (!Number.isFinite(created)) return "Delivered"; // unknown date: treat as old
  const age = now - created;
  if (age < ORDER_STATUS_AGE_MS.shipped) return "Processing";
  if (age <= ORDER_STATUS_AGE_MS.delivered) return "Shipped";
  return "Delivered";
}

function formatOrderDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date unavailable";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sumRow(label, value, className) {
  const row = el("div", "sum-row" + (className ? " " + className : ""));
  row.append(el("dt", "", label), el("dd", "", value));
  return row;
}

// ---------- Rendering ----------
function renderStatusChips() {
  statusChipsEl.replaceChildren(
    ...["All", ...ORDER_STATUS_LIST].map((s) => {
      const b = el("button", "chip" + (s === statusFilter ? " active" : ""), s);
      b.type = "button";
      b.dataset.status = s;
      b.setAttribute("aria-pressed", String(s === statusFilter));
      return b;
    })
  );
}

function buildOrderCard(order, status, index) {
  const card = el("article", "card order-card");
  card.dataset.orderId = order.id;
  card.dataset.status = status;
  card.style.animationDelay = index * 40 + "ms";
  card.setAttribute("aria-label", "Order " + order.id);

  // Top: id + date, status badge
  const top = el("div", "order-top");
  const idBlock = el("div", "order-idblock");
  idBlock.append(el("span", "order-id", order.id));
  const time = el("time", "order-date", formatOrderDate(order.createdAt));
  if (!Number.isNaN(Date.parse(order.createdAt))) time.dateTime = order.createdAt;
  idBlock.append(time);
  top.append(idBlock, el("span", "status-badge status-" + status.toLowerCase(), status));

  // Items
  const list = el("ul", "order-items");
  for (const it of order.items) {
    const li = el("li", "order-item");
    const thumb = el("div", "thumb", it.emoji);
    thumb.style.background = `linear-gradient(135deg, ${it.from}, ${it.to})`;
    thumb.setAttribute("aria-hidden", "true");
    const meta = el("div", "oi-meta");
    meta.append(el("b", "", it.name), el("small", "", `Qty ${it.qty} × ${money(it.price)}`));
    li.append(thumb, meta, el("span", "oi-line", money(it.qty * it.price)));
    list.append(li);
  }

  // Totals + reorder
  const foot = el("div", "order-foot");
  const sums = el("dl", "order-sums");
  sums.append(
    sumRow("Subtotal", money(order.subtotal)),
    sumRow("Shipping", order.shipping === 0 ? "Free" : money(order.shipping), "muted"),
    sumRow("Total", money(order.total), "total")
  );
  const reorder = el("button", "add reorder", "↻ Reorder");
  reorder.type = "button";
  reorder.dataset.reorder = order.id;
  reorder.setAttribute("aria-label", "Reorder items from " + order.id);
  foot.append(sums, reorder);

  card.append(top, list, foot);
  return card;
}

function renderOrders() {
  const orders = loadOrders();
  const now = Date.now();
  const spent = orders.reduce((s, o) => s + o.total, 0);
  statCountEl.textContent = orders.length;
  statSpentEl.textContent = money(spent);
  clearBtn.disabled = orders.length === 0;

  const hasOrders = orders.length > 0;
  ordersEmptyEl.hidden = hasOrders;
  ordersToolbarEl.hidden = !hasOrders;
  ordersCountEl.hidden = !hasOrders;
  if (!hasOrders) {
    ordersListEl.replaceChildren();
    ordersNoMatchEl.hidden = true;
    ordersCountEl.textContent = "";
    hideConfirm(false);
    return;
  }

  const q = orderSearchEl.value.trim().toLowerCase();
  const rows = orders
    .map((o) => ({ order: o, status: orderStatus(o, now) }))
    .filter(
      ({ order, status }) =>
        (statusFilter === "All" || status === statusFilter) &&
        (!q || order.id.toLowerCase().includes(q) || order.items.some((it) => it.name.toLowerCase().includes(q)))
    );

  ordersCountEl.textContent = `Showing ${rows.length} of ${orders.length} order${orders.length === 1 ? "" : "s"}`;
  ordersNoMatchEl.hidden = rows.length > 0;
  ordersListEl.replaceChildren(...rows.map(({ order, status }, i) => buildOrderCard(order, status, i)));
}

// ---------- Reorder ----------
function reorder(orderId) {
  const order = loadOrders().find((o) => o.id === orderId);
  if (!order) return;
  const { added, skipped } = mergeIntoCart(order.items);
  const skipNote = skipped.length ? `${skipped.length} unavailable item${skipped.length === 1 ? "" : "s"} skipped (${skipped.join(", ")})` : "";
  if (added === 0) {
    toast(`None of the items in ${orderId} are available anymore.`, { error: true, duration: 4000 });
    return;
  }
  openCart();
  toast(`Added ${added} item${added === 1 ? "" : "s"} from ${orderId} to your cart` + (skipNote ? ` · ${skipNote}` : ""), {
    duration: skipNote ? 5000 : 2500,
  });
}

// ---------- Clear history (in-page confirm) ----------
function showConfirm() {
  confirmBarEl.hidden = false;
  clearBtn.hidden = true;
  confirmCancelBtn.focus();
}
function hideConfirm(restoreFocus = true) {
  if (confirmBarEl.hidden) return;
  confirmBarEl.hidden = true;
  clearBtn.hidden = false;
  if (restoreFocus) clearBtn.focus();
}

// ---------- Events ----------
statusChipsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-status]");
  if (!btn) return;
  statusFilter = btn.dataset.status;
  renderStatusChips();
  renderOrders();
  statusChipsEl.querySelector(`[data-status="${statusFilter}"]`).focus();
});
orderSearchEl.addEventListener("input", renderOrders);

ordersListEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-reorder]");
  if (btn) reorder(btn.dataset.reorder);
});

resetFiltersBtn.addEventListener("click", () => {
  statusFilter = "All";
  orderSearchEl.value = "";
  renderStatusChips();
  renderOrders();
});

clearBtn.addEventListener("click", showConfirm);
confirmCancelBtn.addEventListener("click", () => hideConfirm());
confirmYesBtn.addEventListener("click", () => {
  if (!saveOrders([])) {
    toast("Couldn't clear your history. Please try again.", { error: true, duration: 4000 });
    return;
  }
  hideConfirm(false);
  renderOrders();
  toast("Order history cleared");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !confirmBarEl.hidden) hideConfirm();
});

// Statuses depend on age, so refresh when the tab comes back; also pick up new orders.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") renderOrders();
});
window.addEventListener("pageshow", (e) => e.persisted && renderOrders());
document.addEventListener("velora:orders-changed", renderOrders);
window.addEventListener("storage", (e) => {
  if (e.key === ORDERS_KEY || e.key === null) renderOrders();
});

// ---------- Init ----------
renderStatusChips();
renderOrders();
