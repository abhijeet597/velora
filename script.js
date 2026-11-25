// ---------- Elements ----------
const grid = document.getElementById("grid");
const chipsEl = document.getElementById("chips");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const countEl = document.getElementById("result-count");
const noResults = document.getElementById("no-results");

const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const cartItemsEl = document.getElementById("cart-items");
const cartCountEl = document.getElementById("cart-count");
const subtotalEl = document.getElementById("subtotal");
const shippingEl = document.getElementById("shipping");
const totalEl = document.getElementById("total");
const checkoutBtn = document.getElementById("checkout");
const toastEl = document.getElementById("toast");

// ---------- Config ----------
const FREE_SHIPPING_MIN = 999;
const SHIPPING_FEE = 79;

// ---------- State ----------
let activeCategory = "All";
let cart = loadCart(); // { [productId]: quantity }

function loadCart() {
  try {
    const data = JSON.parse(localStorage.getItem("velora-cart") || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}
function saveCart() {
  localStorage.setItem("velora-cart", JSON.stringify(cart));
}

const money = (n) => "₹" + n.toLocaleString("en-IN");

// ---------- Catalog ----------
function renderChips() {
  const cats = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
  chipsEl.innerHTML = cats
    .map((c) => `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");
}

function getVisibleProducts() {
  const q = searchEl.value.trim().toLowerCase();
  let list = PRODUCTS.filter(
    (p) =>
      (activeCategory === "All" || p.category === activeCategory) &&
      (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  );
  const sort = sortEl.value;
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
  return list;
}

function renderProducts() {
  const list = getVisibleProducts();
  countEl.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
  noResults.hidden = list.length > 0;
  grid.innerHTML = list
    .map(
      (p, i) => `
    <article class="card" style="animation-delay:${i * 40}ms">
      <div class="art" style="background:linear-gradient(135deg,${p.from},${p.to})">
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
        <span>${p.emoji}</span>
      </div>
      <div class="info">
        <span class="cat">${p.category}</span>
        <h3 class="name">${p.name}</h3>
        <div class="rating"><b>★</b> ${p.rating} (${p.reviews.toLocaleString("en-IN")})</div>
        <div class="buy">
          <span class="price">${money(p.price)}</span>
          <button class="add" data-add="${p.id}">Add +</button>
        </div>
      </div>
    </article>`
    )
    .join("");
}

// ---------- Cart ----------
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

function renderCart() {
  const ids = Object.keys(cart).map(Number).filter((id) => PRODUCTS.some((p) => p.id === id));
  const items = ids.map((id) => ({ ...PRODUCTS.find((p) => p.id === id), qty: cart[id] }));

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;

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
          <button data-dec="${i.id}" aria-label="Decrease">−</button>
          <span>${i.qty}</span>
          <button data-inc="${i.id}" aria-label="Increase">+</button>
        </div>
      </div>
      <button class="remove" data-remove="${i.id}" aria-label="Remove">🗑</button>
    </div>`
    )
    .join("");
}

function openCart() { drawer.classList.add("open"); overlay.classList.add("show"); }
function closeCart() { drawer.classList.remove("open"); overlay.classList.remove("show"); }

// ---------- Toast ----------
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

// ---------- Events ----------
chipsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cat]");
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  renderChips();
  renderProducts();
});
searchEl.addEventListener("input", renderProducts);
sortEl.addEventListener("change", renderProducts);

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (btn) addToCart(Number(btn.dataset.add));
});

cartItemsEl.addEventListener("click", (e) => {
  const inc = e.target.closest("[data-inc]");
  const dec = e.target.closest("[data-dec]");
  const rem = e.target.closest("[data-remove]");
  if (inc) changeQty(Number(inc.dataset.inc), 1);
  if (dec) changeQty(Number(dec.dataset.dec), -1);
  if (rem) removeItem(Number(rem.dataset.remove));
});

document.getElementById("open-cart").addEventListener("click", openCart);
document.getElementById("close-cart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeCart());

checkoutBtn.addEventListener("click", () => {
  cart = {};
  saveCart();
  renderCart();
  closeCart();
  toast("🎉 Order placed! (demo checkout)");
});

// ---------- Init ----------
renderChips();
renderProducts();
renderCart();
