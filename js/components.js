/* ══════════════════════════════════════════════
   components.js — Shared UI Components
   ══════════════════════════════════════════════ */

/* ─── TOAST ─────────────────────────────────── */
const Toast = {
  _container: null,
  init() {
    this._container = document.getElementById('toast-container');
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      document.body.appendChild(this._container);
    }
  },
  show(msg, type = 'success', duration = 2800) {
    if (!this._container) this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
    this._container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut .3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
};

/* ─── MODAL ──────────────────────────────────── */
const Modal = {
  _activeModals: [],
  create(title, bodyHTML, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-box pop-in" style="max-width:${options.maxWidth || '500px'}">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    this._activeModals.push(overlay);
    const close = () => this.close(overlay);
    overlay.querySelector('.modal-backdrop').addEventListener('click', close);
    overlay.querySelector('.modal-close').addEventListener('click', close);
    if (options.onReady) options.onReady(overlay, close);
    return { overlay, close };
  },
  close(overlay) {
    if (!overlay) return;
    overlay.remove();
    this._activeModals = this._activeModals.filter(m => m !== overlay);
    if (this._activeModals.length === 0) document.body.style.overflow = '';
  },
  closeAll() {
    this._activeModals.forEach(m => m.remove());
    this._activeModals = [];
    document.body.style.overflow = '';
  }
};

/* ─── HEADER ─────────────────────────────────── */
function renderHeader(activePage) {
  const session = Storage.getSession();
  const cart    = Storage.getCart();
  const count   = cart.reduce((s, i) => s + i.qty, 0);
  const isAdmin = session && session.isAdmin;

  const el = document.getElementById('header');
  if (!el) return;

  el.innerHTML = `
    <div class="container">
      <div class="header-inner">
        <a href="/" class="header-logo">
          <div class="logo-icon">🎮</div>
          <div class="logo-text">Djib's <span>Shop</span></div>
        </a>
        <nav class="header-nav">
          <a href="/"   class="nav-link ${activePage==='home'?'active':''}">Accueil</a>
          <a href="/shop"    class="nav-link ${activePage==='shop'?'active':''}">Boutique</a>
          ${isAdmin ? `<a href="/admin" class="nav-link ${activePage==='admin'?'active':''}" style="color:var(--accent)">Admin ⚙️</a>` : ''}
        </nav>
        <div class="header-actions">
          <button class="cart-btn" id="cart-toggle" aria-label="Panier">
            🛒
            ${count > 0 ? `<span class="cart-count">${count}</span>` : ''}
            <span style="font-size:12px;font-weight:600">${count > 0 ? count : ''}</span>
          </button>
          ${session
            ? `<a href="/account" class="user-chip ${activePage==='account'?'active':''}">
                 <div class="user-avatar">${session.name.slice(0,2).toUpperCase()}</div>
                 ${session.name.split(' ')[0]}
               </a>`
            : `<a href="/login"    class="btn btn-ghost btn-sm">Connexion</a>
               <a href="/register" class="btn btn-gold btn-sm">S'inscrire</a>`
          }
        </div>
      </div>
    </div>
    <!-- Cart Sidebar -->
    <div id="cart-overlay">
      <div class="cart-backdrop"></div>
      <aside class="cart-sidebar slide-in">
        <div class="cart-header">
          <div class="cart-title">🛒 Panier</div>
          <button class="modal-close" id="cart-close">✕</button>
        </div>
        <div class="cart-items" id="cart-items-list"></div>
        <div class="cart-footer" id="cart-footer" style="display:none">
          <div class="cart-total">
            <span class="cart-total-label">Total</span>
            <span class="cart-total-value" id="cart-total-value">$0.00</span>
          </div>
          <a href="/checkout" class="btn btn-gold btn-full btn-lg">Passer commande →</a>
          ${!session ? '<p style="color:var(--muted);font-size:11px;text-align:center;margin-top:8px">Connectez-vous pour commander</p>' : ''}
        </div>
      </aside>
    </div>`;

  // Cart toggle
  document.getElementById('cart-toggle').addEventListener('click', CartUI.open);
  document.getElementById('cart-close').addEventListener('click', CartUI.close);
  document.getElementById('cart-overlay').querySelector('.cart-backdrop').addEventListener('click', CartUI.close);
  CartUI.renderItems();
}

/* ─── FOOTER ─────────────────────────────────── */
function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="/" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:8px">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--accent),var(--accent-dk));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px">🎮</div>
            <span style="font-family:'Rajdhani',sans-serif;font-weight:800;font-size:20px;color:var(--text)">Djib's <span style="color:var(--accent)">Shop</span></span>
          </a>
          <p class="footer-brand-desc">Le meilleur endroit pour acheter des comptes gaming. Sécurisé, rapide, fiable.</p>
          <div class="footer-social">
            <a href="https://x.com/flrdlsx" target="_blank" rel="noopener" class="social-link">
              <span class="social-icon">𝕏</span> @flrdlsx
            </a>
            <a href="https://discord.com/users/sdjbrl" target="_blank" rel="noopener" class="social-link">
              <span class="social-icon">🎮</span> sdjbrl
            </a>
          </div>
        </div>
        <div>
          <div class="footer-col-title">Boutique</div>
          <a href="/shop?game=Dokkan+Battle" class="footer-link">Dokkan Battle</a>
          <a href="/shop?game=Genshin+Impact" class="footer-link">Genshin Impact</a>
          <a href="/shop?game=Honkai+Star+Rail" class="footer-link">Star Rail</a>
          <a href="/shop?game=Zenless+Zone+Zero" class="footer-link">Zenless Zone Zero</a>
          <a href="/shop" class="footer-link">Tous les jeux →</a>
        </div>
        <div>
          <div class="footer-col-title">Mon compte</div>
          <a href="/login"    class="footer-link">Se connecter</a>
          <a href="/register" class="footer-link">S'inscrire</a>
          <a href="/account"  class="footer-link">Mes commandes</a>
          <a href="/account"  class="footer-link">Mon profil</a>
        </div>
        <div>
          <div class="footer-col-title">Support</div>
          <a href="https://x.com/flrdlsx"  target="_blank" class="footer-link">Twitter / X</a>
          <a href="https://discord.com/users/sdjbrl" target="_blank" class="footer-link">Discord</a>
          <a href="#" class="footer-link">Politique de retour</a>
          <a href="#" class="footer-link">CGV</a>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="footer-copy">© ${new Date().getFullYear()} Djib's Shop. Tous droits réservés. — <a href="https://x.com/flrdlsx" target="_blank" style="color:var(--muted)">𝕏 @flrdlsx</a> · <a href="https://discord.com/users/sdjbrl" target="_blank" style="color:var(--muted)">Discord: sdjbrl</a></div>
        <div class="footer-payments">
          <div class="payment-badge">💳 Stripe</div>
          <div class="payment-badge">🔵 PayPal</div>
        </div>
      </div>
    </div>`;
}

/* ─── PRODUCT CARD ───────────────────────────── */
function buildProductCard(p) {
  const badgeHtml = (() => {
    if (!p.badge) return '';
    if (p.badge === 'instant') return '<span class="badge badge-instant">⚡ Instant</span>';
    if (p.badge === 'premium') return '<span class="badge badge-premium">🏆 Premium</span>';
    if (p.badge === 'off')     return '<span class="badge badge-off">% OFF</span>';
    return '';
  })();
  const stars = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
  const oldP  = p.oldPrice ? `<span class="product-old-price">$${p.oldPrice.toFixed(2)}</span>` : '';

  return `
    <article class="product-card card-hover" data-id="${p.id}">
      <div class="product-banner">
        ${p.hot ? '<div class="product-hot-tag">🔥 HOT</div>' : ''}
        <span class="product-emoji">${p.emoji}</span>
        <div class="product-game">${p.game}</div>
      </div>
      <div class="product-body">
        <div class="product-badges">
          ${badgeHtml}
          <span class="badge badge-cat">${p.category.toUpperCase()}</span>
        </div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-sub">${p.sub}</p>
        <div class="star-row">
          <span class="stars">${stars}</span>
          <span class="review-count">(${p.reviews})</span>
        </div>
        <div class="product-footer">
          <div>${oldP}<span class="product-price">$${p.price.toFixed(2)}</span></div>
          <button class="btn btn-gold btn-sm add-to-cart-btn" data-id="${p.id}">+ Panier</button>
        </div>
      </div>
    </article>`;
}

/* ─── CART UI ────────────────────────────────── */
const CartUI = {
  open() {
    const o = document.getElementById('cart-overlay');
    if (o) { o.classList.add('open'); CartUI.renderItems(); }
  },
  close() {
    const o = document.getElementById('cart-overlay');
    if (o) o.classList.remove('open');
  },
  renderItems() {
    const list   = document.getElementById('cart-items-list');
    const footer = document.getElementById('cart-footer');
    const totalEl= document.getElementById('cart-total-value');
    if (!list) return;
    const cart = Storage.getCart();
    if (cart.length === 0) {
      list.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div>Votre panier est vide</div>`;
      if (footer) footer.style.display = 'none';
      return;
    }
    list.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-game">${item.game}</div>
          <div class="cart-item-footer">
            <span class="cart-item-price">$${item.price.toFixed(2)}</span>
            <button class="cart-remove" data-id="${item.id}">✕ Retirer</button>
          </div>
        </div>
      </div>`).join('');
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    if (footer) footer.style.display = 'block';
    list.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        CartUI.remove(btn.dataset.id);
      });
    });
  },
  add(product) {
    let cart = Storage.getCart();
    const idx = cart.findIndex(i => i.id === product.id);
    if (idx >= 0) cart[idx].qty++;
    else cart.push({ ...product, qty: 1 });
    Storage.setCart(cart);
    // Update counter in header
    const counter = document.querySelector('.cart-count');
    const total = cart.reduce((s, i) => s + i.qty, 0);
    const btn = document.getElementById('cart-toggle');
    if (btn) {
      let span = btn.querySelector('.cart-count');
      if (!span) { span = document.createElement('span'); span.className = 'cart-count'; btn.insertBefore(span, btn.firstChild); }
      span.textContent = total;
      let txt = btn.querySelector('span:not(.cart-count)');
      if (txt) txt.textContent = total;
    }
    CartUI.renderItems();
    Toast.show(`${product.emoji} <strong>${product.name.slice(0,32)}…</strong> ajouté au panier`);
  },
  remove(id) {
    let cart = Storage.getCart().filter(i => i.id !== id);
    Storage.setCart(cart);
    CartUI.renderItems();
    const total = cart.reduce((s, i) => s + i.qty, 0);
    const btn = document.getElementById('cart-toggle');
    if (btn) {
      let span = btn.querySelector('.cart-count');
      if (span) { if (total === 0) span.remove(); else span.textContent = total; }
    }
  },
  clear() { Storage.setCart([]); CartUI.renderItems(); }
};

/* ─── PRODUCT DETAIL MODAL ───────────────────── */
function openProductModal(product) {
  const stars = '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5 - Math.round(product.rating));
  const deliveryMsg = product.badge === 'instant'
    ? '⚡ Livraison instantanée sur la page de confirmation.'
    : '📧 Envoi par email sous 30 min (heures ouvrées GMT+1).';
  const oldP = product.oldPrice ? `<span style="color:var(--muted);text-decoration:line-through;font-size:14px;margin-right:8px">$${product.oldPrice.toFixed(2)}</span>` : '';

  Modal.create(product.game, `
    <div style="text-align:center;margin-bottom:16px">
      <span style="font-size:60px">${product.emoji}</span>
      ${product.hot ? '<div><span class="badge badge-hot" style="margin-top:4px">🔥 HOT</span></div>' : ''}
    </div>
    <h2 style="font-family:Rajdhani,sans-serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:10px">${product.name}</h2>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      <span class="badge badge-cat">${product.category.toUpperCase()}</span>
      <span class="badge badge-cat">${product.sub}</span>
    </div>
    <div class="star-row" style="margin-bottom:14px"><span class="stars">${stars}</span><span class="review-count">(${product.reviews} avis)</span></div>
    <div style="height:1px;background:var(--border);margin:14px 0"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      ${[['Jeu', product.game],['Plateforme', product.sub],['Note', `${product.rating}/5`]].map(([k,v])=>`
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">${k}</div>
          <div style="font-size:12px;font-weight:600;color:var(--text)">${v}</div>
        </div>`).join('')}
    </div>
    <div class="alert alert-info" style="margin-bottom:16px">ℹ️ ${deliveryMsg}</div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>${oldP}<span style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:30px;color:var(--accent)">$${product.price.toFixed(2)}</span></div>
      <button class="btn btn-gold" id="modal-add-btn" style="padding:12px 28px;font-size:16px">Ajouter au panier</button>
    </div>`, { maxWidth: '520px',
    onReady(overlay) {
      overlay.querySelector('#modal-add-btn').addEventListener('click', () => {
        CartUI.add(product);
      });
    }
  });
}

/* ─── AUTH GUARD ─────────────────────────────── */
function requireAuth(redirectTo = '/login') {
  if (!Storage.getSession()) { window.location.href = redirectTo; return false; }
  return true;
}
function requireAdmin(redirectTo = '/') {
  const s = Storage.getSession();
  if (!s || !s.isAdmin) { window.location.href = redirectTo; return false; }
  return true;
}
