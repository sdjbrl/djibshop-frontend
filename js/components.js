/* ══════════════════════════════════════════════
   components.js — Composants partagés v3
   ══════════════════════════════════════════════ */

/* ─── TOAST ─────────────────────────────────── */
const Toast = {
  _c: null,
  init() {
    this._c = document.getElementById('toast-container');
    if (!this._c) { this._c = document.createElement('div'); this._c.id = 'toast-container'; document.body.appendChild(this._c); }
  },
  show(msg, type = 'success', duration = 2800) {
    if (!this._c) this.init();
    const icons = { success:'✅', error:'❌', info:'ℹ️', warn:'⚠️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
    this._c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(), 300); }, duration);
  },
};

/* ─── MODAL ──────────────────────────────────── */
const Modal = {
  _stack: [],
  create(title, bodyHTML, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-box pop-in" style="max-width:${options.maxWidth||'500px'}">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    this._stack.push(overlay);
    const close = () => this.close(overlay);
    overlay.querySelector('.modal-backdrop').addEventListener('click', close);
    overlay.querySelector('.modal-close').addEventListener('click', close);
    if (options.onReady) options.onReady(overlay, close);
    return { overlay, close };
  },
  close(overlay) {
    if (!overlay) return;
    overlay.remove();
    this._stack = this._stack.filter(m => m !== overlay);
    if (!this._stack.length) document.body.style.overflow = '';
  },
};

/* ─── HEADER ─────────────────────────────────── */
function renderHeader(activePage) {
  const session = API.getSession();
  const cart    = API.getCart();
  const count   = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const el      = document.getElementById('header');
  if (!el) return;

  el.innerHTML = `
    <div class="container">
      <div class="header-inner">
        <a href="/" class="header-logo">
          <div class="logo-icon">🎮</div>
          <div class="logo-text">Djib's <span>Shop</span></div>
        </a>
        <nav class="header-nav">
          <a href="/"        class="nav-link ${activePage==='home'?'active':''}">Accueil</a>
          <a href="/shop"    class="nav-link ${activePage==='shop'?'active':''}">Boutique</a>
          <a href="/contact" class="nav-link ${activePage==='contact'?'active':''}">Contact</a>
          ${session?.isAdmin ? `<a href="/admin" class="nav-link ${activePage==='admin'?'active':''}" style="color:var(--accent)">Admin ⚙️</a>` : ''}
        </nav>
        <div class="header-actions">
          <!-- Panier -->
          <button class="cart-btn" id="cart-toggle" aria-label="Panier">
            🛒${count > 0 ? `<span class="cart-count">${count}</span>` : ''}
          </button>

          <!-- Compte connecté → dropdown -->
          ${session ? `
            <div class="user-dropdown-wrap" id="user-dropdown-wrap">
              <button class="user-chip ${activePage==='account'?'active':''}" id="user-chip-btn" type="button">
                <div class="user-avatar">${session.name.slice(0,2).toUpperCase()}</div>
                <span>${session.name.split(' ')[0]}</span>
                <span class="dropdown-arrow">▾</span>
              </button>
              <div class="user-dropdown" id="user-dropdown">
                <div class="user-dropdown-header">
                  <div class="user-avatar user-avatar-lg">${session.name.slice(0,2).toUpperCase()}</div>
                  <div>
                    <div class="user-dropdown-name">${session.name}</div>
                    <div class="user-dropdown-email">${session.email}</div>
                  </div>
                </div>
                <div class="user-dropdown-divider"></div>
                <a href="/account" class="user-dropdown-item">👤 Mon compte</a>
                <a href="/account" class="user-dropdown-item">📦 Mes commandes</a>
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item user-dropdown-logout" id="header-logout-btn" type="button">
                  🚪 Se déconnecter
                </button>
              </div>
            </div>`
          : `<a href="/login"    class="btn btn-ghost btn-sm">Connexion</a>
             <a href="/register" class="btn btn-gold btn-sm">S'inscrire</a>`
          }
        </div>
      </div>
    </div>
`;

  // Panier — injecté dans body pour éviter les problèmes de z-index/stacking context
  CartUI.mount();
  document.getElementById('cart-toggle').addEventListener('click', () => CartUI.open());

  // Dropdown compte
  if (session) {
    const wrap   = document.getElementById('user-dropdown-wrap');
    const btn    = document.getElementById('user-chip-btn');
    const menu   = document.getElementById('user-dropdown');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = wrap.classList.toggle('open');
      menu.style.display = open ? 'block' : 'none';
    });

    // Fermer si clic ailleurs
    document.addEventListener('click', () => {
      wrap.classList.remove('open');
      menu.style.display = 'none';
    }, { once: false, capture: true, passive: true });
    // Empêcher la fermeture sur clic dans le menu
    menu.addEventListener('click', e => e.stopPropagation());

    document.getElementById('header-logout-btn')?.addEventListener('click', () => {
      API.clearSession();
      API.clearCart();
      window.location.href = '/';
    });
  }

  CartUI.renderItems();
}

/* ─── FOOTER ─────────────────────────────────── */
function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid footer-grid-5">
        <div>
          <a href="/" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:10px">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--accent),var(--accent-dk));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px">🎮</div>
            <span style="font-family:'Rajdhani',sans-serif;font-weight:800;font-size:20px;color:var(--text)">Djib's <span style="color:var(--accent)">Shop</span></span>
          </a>
          <p class="footer-brand-desc">Le meilleur endroit pour acheter des comptes gaming. Sécurisé, rapide, fiable.</p>
          <div class="footer-social">
            <a href="https://x.com/flrdlsx" target="_blank" rel="noopener" class="social-link"><span class="social-icon">𝕏</span> @flrdlsx</a>
            <a href="https://discord.com/users/sdjbrl" target="_blank" rel="noopener" class="social-link"><span class="social-icon">🎮</span> sdjbrl</a>
          </div>
        </div>
        <div>
          <div class="footer-col-title">Boutique</div>
          <a href="/shop?game=Dokkan+Battle"    class="footer-link">Dokkan Battle</a>
          <a href="/shop?game=Genshin+Impact"    class="footer-link">Genshin Impact</a>
          <a href="/shop?game=Honkai+Star+Rail"  class="footer-link">Star Rail</a>
          <a href="/shop?game=Zenless+Zone+Zero" class="footer-link">Zenless Zone Zero</a>
          <a href="/shop"                        class="footer-link">Tous les jeux →</a>
        </div>
        <div>
          <div class="footer-col-title">Mon compte</div>
          <a href="/login"    class="footer-link">Se connecter</a>
          <a href="/register" class="footer-link">S'inscrire</a>
          <a href="/account"  class="footer-link">Mes commandes</a>
        </div>
        <div>
          <div class="footer-col-title">Support</div>
          <a href="/contact"  class="footer-link">Nous contacter</a>
          <a href="https://x.com/flrdlsx" target="_blank" class="footer-link">Twitter / X</a>
          <a href="https://discord.com/users/sdjbrl" target="_blank" class="footer-link">Discord</a>
        </div>
        <div>
          <div class="footer-col-title">Légal</div>
          <a href="/cgv" class="footer-link">CGV</a>
          <a href="/politique-confidentialite" class="footer-link">Politique de confidentialité</a>
          <a href="/politique-confidentialite#cookies" class="footer-link">Gestion des cookies</a>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="footer-copy">© ${new Date().getFullYear()} Djib's Shop — <a href="https://x.com/flrdlsx" target="_blank" style="color:var(--muted)">𝕏 @flrdlsx</a> · <a href="https://discord.com/users/sdjbrl" target="_blank" style="color:var(--muted)">Discord: sdjbrl</a></div>
        <div class="footer-payments"><div class="payment-badge">💳 Stripe</div><div class="payment-badge">🔵 PayPal</div></div>
      </div>
    </div>`;
}

/* ─── PRODUCT CARD ───────────────────────────── */
function buildProductCard(p) {
  const badgeMap = { instant:'<span class="badge badge-instant">⚡ Instant</span>', premium:'<span class="badge badge-premium">🏆 Premium</span>', off:'<span class="badge badge-off">% OFF</span>' };
  const badge    = p.badge ? (badgeMap[p.badge] || '') : '';
  const stars    = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
  const oldP     = p.oldPrice ? `<span class="product-old-price">$${p.oldPrice.toFixed(2)}</span>` : '';
  const catLabel = { starter:'Starter', farmed:'Farmed', premium:'Premium' }[p.category] || p.category;
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="pc-head">
        <span class="pc-emoji">${p.emoji}</span>
        <div class="pc-meta">
          <span class="pc-game">${p.game}</span>
          <div class="pc-badges">
            ${badge}
            <span class="badge badge-cat">${catLabel}</span>
            ${p.hot ? '<span class="badge badge-hot">🔥 Hot</span>' : ''}
          </div>
        </div>
      </div>
      <div class="pc-body">
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-sub">${p.sub}</p>
        <div class="pc-stars"><span class="stars">${stars}</span><span class="review-count">(${p.reviews})</span></div>
      </div>
      <div class="pc-foot">
        <div class="pc-price">${oldP}<span class="price-main">$${p.price.toFixed(2)}</span></div>
        <button class="btn btn-gold btn-sm add-to-cart-btn" data-id="${p.id}">+ Panier</button>
      </div>
    </article>`;
}

/* ─── CART UI ─────────────────────────────────
   Injecté directement dans <body> pour éviter
   tout problème de stacking context / z-index
   ─────────────────────────────────────────── */
const CartUI = {

  /* Crée et insère le panier dans <body> (une seule fois) */
  mount() {
    if (document.getElementById('cart-overlay')) return; // déjà monté
    const el = document.createElement('div');
    el.innerHTML = `
      <div id="cart-backdrop"></div>
      <div id="cart-overlay">
        <div class="cart-header">
          <div class="cart-title">🛒 Mon Panier</div>
          <button class="modal-close" id="cart-close">✕</button>
        </div>
        <div class="cart-items" id="cart-items-list"></div>
        <div class="cart-footer" id="cart-footer" style="display:none">
          <div class="cart-total">
            <span class="cart-total-label">Total</span>
            <span class="cart-total-value" id="cart-total-value">$0.00</span>
          </div>
          <a href="/checkout" class="btn btn-gold btn-full btn-lg">Passer commande →</a>
        </div>
      </div>`;
    // Append les 2 enfants directement dans body
    while (el.firstChild) document.body.appendChild(el.firstChild);
    document.getElementById('cart-backdrop').addEventListener('click', () => CartUI.close());
    document.getElementById('cart-close').addEventListener('click',   () => CartUI.close());
  },

  open() {
    if (!document.getElementById('cart-overlay')) CartUI.mount();
    CartUI.renderItems();
    document.getElementById('cart-backdrop').classList.add('open');
    document.getElementById('cart-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('cart-backdrop')?.classList.remove('open');
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  },

  renderItems() {
    const list    = document.getElementById('cart-items-list');
    const footer  = document.getElementById('cart-footer');
    const totalEl = document.getElementById('cart-total-value');
    if (!list) return;
    const cart = API.getCart();
    if (!cart.length) {
      list.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🛒</div>
          <p>Votre panier est vide</p>
          <a href="/shop" class="btn btn-ghost btn-sm" style="margin-top:10px">Parcourir →</a>
        </div>`;
      if (footer) footer.style.display = 'none';
      CartUI._updateBadge(0);
      return;
    }
    list.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name" title="${item.name}">${item.name.length > 38 ? item.name.slice(0,35)+'…' : item.name}</div>
          <div class="cart-item-game">${item.game}</div>
          <div class="cart-item-row">
            <div class="qty-control">
              <button class="qty-btn qty-minus" data-id="${item.id}" ${(item.qty||1)<=1?'disabled':''}>−</button>
              <span class="qty-value">${item.qty||1}</span>
              <button class="qty-btn qty-plus"  data-id="${item.id}">+</button>
            </div>
            <span class="cart-item-price">$${(item.price*(item.qty||1)).toFixed(2)}</span>
            <button class="cart-remove" data-id="${item.id}" title="Supprimer">🗑</button>
          </div>
        </div>
      </div>`).join('');
    const total = cart.reduce((s,i) => s + i.price*(i.qty||1), 0);
    const count = cart.reduce((s,i) => s + (i.qty||1), 0);
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    if (footer)  footer.style.display = 'block';
    CartUI._updateBadge(count);
    list.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); CartUI.changeQty(b.dataset.id,-1); }));
    list.querySelectorAll('.qty-plus').forEach(b  => b.addEventListener('click', e => { e.stopPropagation(); CartUI.changeQty(b.dataset.id,+1); }));
    list.querySelectorAll('.cart-remove').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); CartUI.remove(b.dataset.id); }));
  },

  add(product) {
    let cart = API.getCart();
    const idx = cart.findIndex(i => i.id === product.id);
    if (idx >= 0) cart[idx].qty = (cart[idx].qty||1)+1;
    else cart.push({...product, qty:1});
    API.setCart(cart);
    CartUI.renderItems();
    CartUI._updateBadge(cart.reduce((s,i)=>s+(i.qty||1),0));
    Toast.show(`${product.emoji} <strong>${product.name.slice(0,28)}…</strong> ajouté au panier`);
  },

  changeQty(id, delta) {
    let cart = API.getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx<0) return;
    cart[idx].qty = Math.max(1, (cart[idx].qty||1)+delta);
    API.setCart(cart);
    CartUI.renderItems();
  },

  remove(id) {
    API.setCart(API.getCart().filter(i => i.id !== id));
    CartUI.renderItems();
    Toast.show('Article retiré','warn');
  },

  clear() { API.clearCart(); CartUI.renderItems(); },

  _updateBadge(count) {
    const btn = document.getElementById('cart-toggle');
    if (!btn) return;
    let badge = btn.querySelector('.cart-count');
    if (count > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className='cart-count'; btn.appendChild(badge); }
      badge.textContent = count;
    } else badge?.remove();
  },
};

/* ─── PRODUCT DETAIL MODAL ───────────────────── */
function openProductModal(product) {
  const stars = '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5 - Math.round(product.rating));
  const deliveryMsg = product.badge === 'instant' ? '⚡ Livraison instantanée sur la page de confirmation.' : '📧 Envoi par email sous 30 min (heures ouvrées GMT+1).';
  const oldP = product.oldPrice ? `<span style="color:var(--muted);text-decoration:line-through;font-size:14px;margin-right:8px">$${product.oldPrice.toFixed(2)}</span>` : '';
  Modal.create(product.game, `
    <div style="text-align:center;margin-bottom:18px">
      <span style="font-size:52px">${product.emoji}</span>
      ${product.hot ? '<div style="margin-top:4px"><span class="badge badge-hot">🔥 HOT</span></div>' : ''}
    </div>
    <h2 style="font-family:Rajdhani,sans-serif;font-size:20px;font-weight:700;color:var(--text);margin-bottom:8px">${product.name}</h2>
    <p style="color:var(--muted);font-size:13px;margin-bottom:14px">${product.sub}</p>
    <div class="star-row" style="margin-bottom:14px"><span class="stars">${stars}</span><span class="review-count">(${product.reviews} avis)</span></div>
    <div class="alert alert-info" style="margin-bottom:16px">ℹ️ ${deliveryMsg}</div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>${oldP}<span style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:28px;color:var(--accent)">$${product.price.toFixed(2)}</span></div>
      <button class="btn btn-gold" id="modal-add-btn" style="padding:12px 26px">Ajouter au panier</button>
    </div>`, {
    maxWidth: '480px',
    onReady(overlay) { overlay.querySelector('#modal-add-btn').addEventListener('click', () => CartUI.add(product)); }
  });
}

/* ─── AUTH GUARDS ────────────────────────────── */
function requireAuth(redirectTo = '/login') {
  if (!API.getSession()) { window.location.href = redirectTo; return false; }
  return true;
}
function requireAdmin(redirectTo = '/') {
  const s = API.getSession();
  if (!s || !s.isAdmin) { window.location.href = redirectTo; return false; }
  return true;
}
