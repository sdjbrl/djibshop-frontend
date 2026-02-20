/* ══════════════════════════════════════════════
   shop.js — Shop Page Logic
   ══════════════════════════════════════════════ */

let shopState = {
  search: '',
  game:   'Tous',
  cat:    'Tous',
  sort:   'popular',
};

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('shop');
  renderFooter();
  Toast.init();

  // Read URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('game')) shopState.game = decodeURIComponent(params.get('game'));

  initShop();
});

function initShop() {
  renderSidebar();
  bindFilters();
  renderProducts();
}

function getGames() {
  const products = Storage.getProducts();
  const games = ['Tous', ...new Set(products.map(p => p.game))];
  return games;
}

function renderSidebar() {
  const products = Storage.getProducts();
  const games = getGames();
  const cats  = ['Tous', ...new Set(products.map(p => p.category))];

  const gamesEl = document.getElementById('sidebar-games');
  if (gamesEl) {
    gamesEl.innerHTML = games.map(g => {
      const count = g === 'Tous' ? products.length : products.filter(p => p.game === g).length;
      const emojis = { 'Dokkan Battle':'🐉','Genshin Impact':'⚔️','Honkai Star Rail':'🌌','Zenless Zone Zero':'⚡','Dragon Ball Legends':'🔥','One Piece':'⚓','FGO':'✨' };
      return `<button class="sidebar-option ${shopState.game === g ? 'active' : ''}" data-game="${g}">
        <span class="sidebar-option-emoji">${emojis[g] || '🎮'}</span>
        ${g}
        <span class="sidebar-count">${count}</span>
      </button>`;
    }).join('');
    gamesEl.querySelectorAll('.sidebar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        shopState.game = btn.dataset.game;
        gamesEl.querySelectorAll('.sidebar-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts();
      });
    });
  }

  const catsEl = document.getElementById('sidebar-cats');
  if (catsEl) {
    const catLabels = { 'Tous':'Tous', 'starter':'Starter', 'farmed':'Farmed', 'premium':'Premium' };
    catsEl.innerHTML = cats.map(c => {
      const count = c === 'Tous' ? products.length : products.filter(p => p.category === c).length;
      return `<button class="sidebar-option ${shopState.cat === c ? 'active' : ''}" data-cat="${c}">
        ${catLabels[c] || c} <span class="sidebar-count">${count}</span>
      </button>`;
    }).join('');
    catsEl.querySelectorAll('.sidebar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        shopState.cat = btn.dataset.cat;
        catsEl.querySelectorAll('.sidebar-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts();
      });
    });
  }
}

function bindFilters() {
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    searchInput.value = shopState.search;
    searchInput.addEventListener('input', e => {
      shopState.search = e.target.value;
      renderProducts();
    });
  }
  const gameSelect = document.getElementById('filter-game');
  if (gameSelect) {
    gameSelect.innerHTML = getGames().map(g => `<option value="${g}" ${shopState.game===g?'selected':''}>${g}</option>`).join('');
    gameSelect.addEventListener('change', e => {
      shopState.game = e.target.value;
      renderProducts();
    });
  }
  const sortSelect = document.getElementById('filter-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      shopState.sort = e.target.value;
      renderProducts();
    });
  }
}

function getFiltered() {
  let products = Storage.getProducts();
  if (shopState.game !== 'Tous') products = products.filter(p => p.game === shopState.game);
  if (shopState.cat  !== 'Tous') products = products.filter(p => p.category === shopState.cat);
  if (shopState.search) {
    const q = shopState.search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.game.toLowerCase().includes(q) ||
      p.sub.toLowerCase().includes(q)
    );
  }
  if (shopState.sort === 'price-asc')  products = [...products].sort((a,b) => a.price - b.price);
  if (shopState.sort === 'price-desc') products = [...products].sort((a,b) => b.price - a.price);
  if (shopState.sort === 'popular')    products = [...products].sort((a,b) => b.reviews - a.reviews);
  if (shopState.sort === 'newest')     products = [...products].reverse();
  return products;
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('products-count');
  if (!grid) return;
  const filtered = getFiltered();
  if (countEl) countEl.textContent = `${filtered.length} produit${filtered.length > 1 ? 's' : ''}`;
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results" style="grid-column:1/-1">
      <div class="no-results-icon">🎮</div>
      <div>Aucun produit trouvé pour cette recherche.</div>
    </div>`;
    return;
  }
  grid.innerHTML = filtered.map(p => buildProductCard(p)).join('');
  // Bind cards
  const allProducts = Storage.getProducts();
  grid.querySelectorAll('.product-card').forEach(card => {
    const id = card.dataset.id;
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    card.addEventListener('click', e => {
      if (e.target.closest('.add-to-cart-btn')) return;
      openProductModal(product);
    });
    const addBtn = card.querySelector('.add-to-cart-btn');
    if (addBtn) {
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        CartUI.add(product);
        addBtn.textContent = '✓';
        addBtn.disabled = true;
        setTimeout(() => { addBtn.textContent = '+ Panier'; addBtn.disabled = false; }, 1400);
      });
    }
  });
  // Update sidebar counts
  renderSidebar();
}
