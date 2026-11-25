// Shared across every page: cart, toast, money formatting, orders storage and checkout.
// Loaded after products.js. Plain <script>, so top-level names are global: keep them unique.

// ---------- Config ----------
const CART_KEY = "velora-cart";
const ORDERS_KEY = "velora-orders";
const FREE_SHIPPING_MIN = 999;
const SHIPPING_FEE = 79;

// ---------- Elements (same markup on every page) ----------
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const cartItemsEl = document.getElementById("cart-items");
const cartCountEl = document.getElementById("cart-count");
const subtotalEl = document.getElementById("subtotal");
const shippingEl = document.getElementById("shipping");
const totalEl = document.getElementById("total");
const checkoutBtn = document.getElementById("checkout");
const toastEl = document.getElementById("toast");
const openCartBtn = document.getElementById("open-cart");

// ---------- Helpers ----------
const money = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

// Only accept hex colours from stored data, so nothing odd ends up in a style attribute.
function safeColor(value, fallback = "#e8e8f2") {
  const v = typeof value === "string" ? value.trim() : "";
  return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ? v : fallback;
}

function shippingFor(subtotal) {
  return subtotal === 0 || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
}

function readStorageJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorageJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ---------- Cart state ----------
function loadCart() {
  const data = readStorageJSON(CART_KEY, {});
  const clean = {};
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [id, qty] of Object.entries(data)) {
      const q = Math.floor(Number(qty));
      if (Number.isFinite(q) && q > 0) clean[id] = q;
    }
  }
  return clean;
}
let cart = loadCart(); // { [productId]: quantity }

function saveCart() {
  return writeStorageJSON(CART_KEY, cart);
}

function getCartLines() {
  return Object.keys(cart)
    .map(Number)
    .filter((id) => PRODUCTS.some((p) => p.id === id))
    .map((id) => ({ ...PRODUCTS.find((p) => p.id === id), qty: cart[id] }));
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  renderCart();
  const p = PRODUCTS.find((x) => x.id === id);
  toast(`${p.name} added to cart`);
  cartCountEl.classList.remove("bump");
  void cartCountEl.offsetWidth; // restart animation
  cartCountEl.classList.add("bump");
}

function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
  renderCart();
}

function removeItem(id) {
  delete cart[id];
  saveCart();
  renderCart();
}

// Merge order items into the cart. Products that no longer exist are skipped.
function mergeIntoCart(items) {
  let added = 0;
  const skipped = [];
  for (const it of items) {
    const product = PRODUCTS.find((p) => p.id === it.id);
    if (!product) {
      skipped.push(it.name);
      continue;
    }
    cart[product.id] = (cart[product.id] || 0) + it.qty;
    added += it.qty;
  }
  saveCart();
  renderCart();
  return { added, skipped };
}

function renderCart() {
  const items = getCartLines();
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = shippingFor(subtotal);

  cartCountEl.textContent = count;
  subtotalEl.textContent = money(subtotal);
  shippingEl.textContent = subtotal === 0 ? "—" : shipping === 0 ? "Free" : money(shipping);
  totalEl.textContent = money(subtotal + shipping);
  checkoutBtn.disabled = count === 0;

  if (items.length === 0) {
    cartItemsEl.innerHTML = `<div class="empty-cart"><div>🛍️</div><p>Your cart is empty.<br/>Start adding something you love!</p></div>`;
    return;
  }

  cartItemsEl.innerHTML = items
    .map(
      (i) => `
    <div class="line">
      <div class="thumb" style="background:linear-gradient(135deg,${i.from},${i.to})">${i.emoji}</div>
      <div class="meta">
        <b>${i.name}</b>
        <small>${money(i.price)}</small>
        <div class="qty">
          <button data-dec="${i.id}" aria-label="Decrease quantity of ${i.name}">−</button>
          <span>${i.qty}</span>
          <button data-inc="${i.id}" aria-label="Increase quantity of ${i.name}">+</button>
        </div>
      </div>
      <button class="remove" data-remove="${i.id}" aria-label="Remove ${i.name}">🗑</button>
    </div>`
    )
    .join("");
}

let drawerOpener = null;
function openCart() {
  drawerOpener = document.activeElement;
  drawer.inert = false;
  drawer.classList.add("open");
  overlay.classList.add("show");
  document.getElementById("close-cart").focus({ preventScroll: true });
}
function closeCart() {
  const wasOpen = drawer.classList.contains("open");
  drawer.classList.remove("open");
  overlay.classList.remove("show");
  drawer.inert = true;
  if (wasOpen && drawerOpener && document.contains(drawerOpener)) drawerOpener.focus({ preventScroll: true });
  drawerOpener = null;
}

// ---------- Toast ----------
// toast(message, { href, linkText, error, duration })
let toastTimer;
let toastClearTimer;
function toast(msg, opts = {}) {
  clearTimeout(toastTimer);
  clearTimeout(toastClearTimer);
  toastEl.textContent = "";
  toastEl.classList.toggle("error", !!opts.error);

  const text = document.createElement("span");
  text.textContent = msg;
  toastEl.appendChild(text);
  if (opts.href) {
    const link = document.createElement("a");
    link.href = opts.href;
    link.textContent = opts.linkText || "View";
    toastEl.appendChild(link);
  }
  toastEl.classList.add("show");
  toastEl.dataset.duration = String(opts.duration || (opts.href ? 6000 : 1800));
  scheduleToastHide();
}
function scheduleToastHide() {
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
    // Empty it once it has slid away so the hidden link can't be tabbed to.
    toastClearTimer = setTimeout(() => {
      if (!toastEl.classList.contains("show")) toastEl.textContent = "";
    }, 450);
  }, Number(toastEl.dataset.duration) || 1800);
}
// Pause the timer while the toast is hovered or focused so its link stays reachable.
toastEl.addEventListener("mouseenter", () => clearTimeout(toastTimer));
toastEl.addEventListener("focusin", () => clearTimeout(toastTimer));
toastEl.addEventListener("mouseleave", () => toastEl.classList.contains("show") && scheduleToastHide());
toastEl.addEventListener("focusout", () => toastEl.classList.contains("show") && scheduleToastHide());

// ---------- Orders ----------
// Coerce a stored value into a well-formed order, or null if it is unusable.
function normalizeOrder(o) {
  if (!o || typeof o !== "object" || typeof o.id !== "string" || !o.id || !Array.isArray(o.items)) return null;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const items = o.items
    .filter((it) => it && typeof it === "object")
    .map((it) => ({
      id: Number(it.id),
      name: String(it.name ?? "Unknown item"),
      emoji: String(it.emoji ?? "🛍️"),
      from: safeColor(it.from),
      to: safeColor(it.to),
      price: num(it.price),
      qty: Math.max(1, Math.floor(num(it.qty)) || 1),
    }));
  return {
    id: o.id,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    status: typeof o.status === "string" ? o.status : "Processing",
    items,
    subtotal: num(o.subtotal),
    shipping: num(o.shipping),
    total: num(o.total),
  };
}

// Missing, corrupt or non-array data all load as an empty list.
function loadOrders() {
  const data = readStorageJSON(ORDERS_KEY, []);
  return Array.isArray(data) ? data.map(normalizeOrder).filter(Boolean) : [];
}

function saveOrders(list) {
  return writeStorageJSON(ORDERS_KEY, list);
}

function generateOrderId(existing) {
  const taken = new Set(existing.map((o) => o.id));
  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix;
    if (window.crypto && crypto.getRandomValues) {
      suffix = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    } else {
      suffix = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
    }
    const id = "VEL-" + suffix;
    if (!taken.has(id)) return id;
  }
  return "VEL-" + Date.now().toString(36).toUpperCase(); // practically unreachable
}

// Snapshot the cart into an order and store it. Returns the order, or null if it could not be saved.
function placeOrder(lines) {
  const subtotal = lines.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = shippingFor(subtotal);
  const orders = loadOrders();
  const order = {
    id: generateOrderId(orders),
    createdAt: new Date().toISOString(),
    status: "Processing",
    items: lines.map((i) => ({ id: i.id, name: i.name, emoji: i.emoji, from: i.from, to: i.to, price: i.price, qty: i.qty })),
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
  return saveOrders([order, ...orders]) ? order : null;
}

function checkout() {
  const lines = getCartLines();
  if (lines.length === 0) return;
  const order = placeOrder(lines);
  if (!order) {
    // Keep the cart so nothing is lost.
    toast("Couldn't save your order. Your cart is unchanged.", { error: true, duration: 4000 });
    return;
  }
  cart = {};
  saveCart();
  renderCart();
  closeCart();
  toast(`🎉 Order ${order.id} placed!`, { href: "orders.html", linkText: "View orders" });
  document.dispatchEvent(new CustomEvent("velora:orders-changed"));
}

// ---------- Events ----------
cartItemsEl.addEventListener("click", (e) => {
  const inc = e.target.closest("[data-inc]");
  const dec = e.target.closest("[data-dec]");
  const rem = e.target.closest("[data-remove]");
  if (inc) changeQty(Number(inc.dataset.inc), 1);
  if (dec) changeQty(Number(dec.dataset.dec), -1);
  if (rem) removeItem(Number(rem.dataset.remove));
});

openCartBtn.addEventListener("click", openCart);
document.getElementById("close-cart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeCart());
checkoutBtn.addEventListener("click", checkout);

// Keep the cart in sync with other tabs.
window.addEventListener("storage", (e) => {
  if (e.key === CART_KEY || e.key === null) {
    cart = loadCart();
    renderCart();
  }
});

// ---------- Init ----------
drawer.inert = true;
renderCart();
