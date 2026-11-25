// Catalog page logic only: search, filters, sort and the product grid.
// Cart, toast, money and checkout live in cart.js (loaded first).

// ---------- Elements ----------
const grid = document.getElementById("grid");
const chipsEl = document.getElementById("chips");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const countEl = document.getElementById("result-count");
const noResults = document.getElementById("no-results");

// ---------- State ----------
let activeCategory = "All";

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

// ---------- Init ----------
renderChips();
renderProducts();
