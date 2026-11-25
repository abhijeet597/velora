# Velora 🛍️

A modern e-commerce storefront demo. Pure HTML, CSS and JavaScript, with no build step and no dependencies.

## Features
- Responsive product grid with animated cards
- Category filter, live search and sorting (price, rating)
- Slide-in cart drawer with quantity controls
- Free-shipping rule (free over ₹999, otherwise ₹79)
- Cart persisted in `localStorage`
- Demo checkout

## Run it
Open `index.html` in a browser, or view the live site on GitHub Pages:
`https://<your-username>.github.io/velora/`

## Project structure
```
velora/
├── index.html     # page layout
├── style.css      # styles
├── products.js    # product catalog (edit to add products)
├── script.js      # filtering, cart and checkout logic
└── .github/workflows/pages.yml   # auto-deploy to GitHub Pages
```
