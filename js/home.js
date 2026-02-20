/* ══════════════════════════════════════════════
   home.js — Homepage Logic
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('home');
  renderFooter();
  Toast.init();
  initHome();
});

function initHome() {
  renderGameGrid();
  renderFeaturedProducts();
  bindCTAs();
}

function renderGameGrid() {
  const games = [
    { emoji:'🐉', name:'Dokkan Battle',       slug:'Dokkan+Battle' },
    { emoji:'⚔️', name:'Genshin Impact',       slug:'Genshin+Impact' },
    { emoji:'🌌', name:'Honkai Star Rail',      slug:'Honkai+Star+Rail' },
    { emoji:'⚡', name:'Zenless Zone Zero',     slug:'Zenless+Zone+Zero' },
    { emoji:'🔥', name:'Dragon Ball Legends',   slug:'Dragon+Ball+Legends' },
    { emoji:'⚓', name:'One Piece',             slug:'One+Piece' },
    { emoji:'✨', name:'FGO',                   slug:'FGO' },
    { emoji:'🎮', name:'Tous les jeux',         slug:'' },
  ];
  const grid = document.getElementById('games-grid');
  if (!grid) return;
  grid.innerHTML = games.map(g => `
    <a href="/shop${g.slug ? '?game='+g.slug : ''}" class="game-card">
      <div class="game-emoji">${g.emoji}</div>
      <div class="game-name">${g.name}</div>
    </a>`).join('');
}

function renderFeaturedProducts() {
  const products = Storage.getProducts();
  const featured = products
    .filter(p => p.hot || p.reviews >= 25)
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 4);
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  grid.innerHTML = featured.map(p => buildProductCard(p)).join('');
  bindProductCards(grid);
}

function bindProductCards(container) {
  container.querySelectorAll('.product-card').forEach(card => {
    const id = card.dataset.id;
    const product = Storage.getProducts().find(p => p.id === id);
    if (!product) return;
    card.addEventListener('click', e => {
      if (e.target.classList.contains('add-to-cart-btn') || e.target.closest('.add-to-cart-btn')) return;
      openProductModal(product);
    });
    const addBtn = card.querySelector('.add-to-cart-btn');
    if (addBtn) {
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        CartUI.add(product);
        addBtn.textContent = '✓ Ajouté';
        addBtn.disabled = true;
        setTimeout(() => { addBtn.textContent = '+ Panier'; addBtn.disabled = false; }, 1500);
      });
    }
  });
}

function bindCTAs() {
  document.querySelectorAll('[data-goto-shop]').forEach(el => {
    el.addEventListener('click', () => window.location.href = '/shop');
  });
}
