# Velora 🛍️

A modern e-commerce storefront demo. Pure HTML, CSS and JavaScript, with no build step and no dependencies.

## Features
- Responsive product grid with animated cards
- Category filter, live search and sorting (price, rating)
- Slide-in cart drawer with quantity controls
- Free-shipping rule (free over ₹999, otherwise ₹79)
- Cart persisted in `localStorage`
- Checkout saves each order (snapshot of items, prices and shipping) to `localStorage`
- Order History page (`orders.html`): newest-first order cards, status badges (Processing → Shipped → Delivered, based on order age), status filter, search by order ID or item, one-click Reorder, and Clear history with an in-page confirm
- Navbar links between Shop and Orders; the cart drawer works on both pages

## Run it
Open `index.html` in a browser, or view the live site on GitHub Pages:
`https://abhijeet597.github.io/Velora/`

## Project structure
```
velora/
├── index.html     # storefront page
├── orders.html    # order history page
├── style.css      # styles (shared by both pages)
├── products.js    # product catalog (edit to add products)
├── cart.js        # shared: cart, toast, money helper, order storage and checkout
├── script.js      # storefront only: search, category filter, sorting
├── orders.js      # order history: rendering, status, filters, reorder, clear
```

## Data in `localStorage`
- `velora-cart`: `{ [productId]: quantity }`
- `velora-orders`: array of orders, newest first: `{ id, createdAt, status, items: [{ id, name, emoji, from, to, price, qty }], subtotal, shipping, total }`

## Releasing
JS and CSS are cached by GitHub Pages and browsers. Every local asset in `index.html` and `orders.html` carries a version query (for example `style.css?v=2`). **Bump it in both files on every release** so visitors never run a stale script against new HTML.
