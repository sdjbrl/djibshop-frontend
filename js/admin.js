/* ══════════════════════════════════════════════
   admin.js — Admin Panel Logic
   ══════════════════════════════════════════════ */

let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin('/')) return;

  renderHeader('admin');
  renderFooter();
  Toast.init();
  initAdmin();
});

function initAdmin() {
  renderAdminStats();
  initAdminTabs();
  renderProductTable();
  initProductForm();
}

/* ─── STATS ──────────────────────────────────── */
function renderAdminStats() {
  const products = Storage.getProducts();
  const allOrders= Storage.getAllOrders();
  const totalRev = allOrders.reduce((s, o) => s + o.total, 0);
  const users    = Storage.getUsers();
  const userCount= Object.values(users).filter(u => !u.isAdmin).length;

  const el = document.getElementById('admin-stats');
  if (!el) return;
  [
    ['📦', products.length, 'Produits actifs'],
    ['🛒', allOrders.length, 'Commandes totales'],
    ['💰', '$' + totalRev.toFixed(2), 'Revenus totaux'],
    ['👥', userCount, 'Clients inscrits'],
  ].forEach(([e, v, l], i) => {
    const card = el.children[i];
    if (card) {
      card.querySelector('.admin-stat-value').textContent = v;
      card.querySelector('.admin-stat-label').textContent = l;
      card.querySelector('.admin-stat-label').insertAdjacentHTML('beforebegin', `<div style="font-size:22px;margin-bottom:6px">${e}</div>`);
    }
  });
}

/* ─── TABS ───────────────────────────────────── */
function initAdminTabs() {
  const tabs   = document.querySelectorAll('.admin-tab');
  const panels = document.querySelectorAll('.admin-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const p = document.getElementById('admin-panel-' + tab.dataset.tab);
      if (p) { p.style.display = 'block'; p.classList.add('fade-in'); }
      if (tab.dataset.tab === 'products') renderProductTable();
      if (tab.dataset.tab === 'orders')   renderAdminOrders();
      if (tab.dataset.tab === 'users')    renderAdminUsers();
    });
  });
}

/* ─── PRODUCT TABLE ──────────────────────────── */
function renderProductTable() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  const products = Storage.getProducts();
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted)">Aucun produit. Ajoutez-en un ci-dessous.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><span style="font-size:20px">${p.emoji}</span></td>
      <td>
        <div class="td-name">${p.name}</div>
        <div style="font-size:11px;color:var(--muted)">${p.game} · ${p.sub}</div>
      </td>
      <td><span class="badge badge-cat">${p.category}</span></td>
      <td class="td-price">$${p.price.toFixed(2)}</td>
      <td style="font-size:12px;color:var(--muted)">${p.reviews} avis</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-ghost btn-sm edit-btn" data-id="${p.id}">✏️ Éditer</button>
          <button class="btn btn-danger btn-sm del-btn"  data-id="${p.id}">🗑 Suppr.</button>
        </div>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editProduct(btn.dataset.id));
  });
  tbody.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

/* ─── PRODUCT FORM ───────────────────────────── */
const EMOJIS = ['🐉','⚔️','🌌','⚡','🔥','⚓','✨','🎮','🏆','🌟','💎','🎯','🃏','🦸','👾'];
const GAMES  = ['Dokkan Battle','Genshin Impact','Honkai Star Rail','Zenless Zone Zero','Dragon Ball Legends','One Piece','FGO','Autres'];

function initProductForm() {
  // Populate game select
  const gameSelect = document.getElementById('form-game');
  if (gameSelect) {
    gameSelect.innerHTML = GAMES.map(g => `<option value="${g}">${g}</option>`).join('');
  }
  // Emoji picker
  const emojiPicker = document.getElementById('emoji-picker');
  const emojiInput  = document.getElementById('form-emoji');
  if (emojiPicker && emojiInput) {
    emojiPicker.innerHTML = EMOJIS.map(e =>
      `<div class="emoji-opt ${emojiInput.value === e ? 'selected':''}" data-emoji="${e}">${e}</div>`
    ).join('');
    emojiPicker.querySelectorAll('.emoji-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        emojiInput.value = opt.dataset.emoji;
        emojiPicker.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
  }
  // Submit
  const form = document.getElementById('product-form');
  if (form) form.addEventListener('submit', submitProductForm);
  // Cancel
  const cancelBtn = document.getElementById('form-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', resetForm);
  // Show add form button
  const showBtn = document.getElementById('show-add-form');
  if (showBtn) {
    showBtn.addEventListener('click', () => {
      const formCard = document.getElementById('product-form-card');
      if (formCard) { formCard.style.display = formCard.style.display === 'none' ? 'block' : 'none'; }
    });
  }
}

function submitProductForm(e) {
  e.preventDefault();
  const get = id => document.getElementById(id)?.value?.trim();
  const name     = get('form-name');
  const game     = get('form-game');
  const sub      = get('form-sub');
  const emoji    = get('form-emoji') || '🎮';
  const price    = parseFloat(get('form-price'));
  const oldPrice = get('form-old-price') ? parseFloat(get('form-old-price')) : null;
  const category = get('form-category');
  const badge    = get('form-badge') || null;
  const hot      = document.getElementById('form-hot')?.checked || false;
  const rating   = parseFloat(get('form-rating')) || 5.0;
  const reviews  = parseInt(get('form-reviews')) || 0;

  if (!name || !game || !sub || isNaN(price)) {
    Toast.show('Veuillez remplir tous les champs obligatoires.', 'error');
    return;
  }

  const products = Storage.getProducts();
  if (editingId) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx >= 0) {
      products[idx] = { ...products[idx], name, game, sub, emoji, price, oldPrice, category, badge, hot, rating, reviews };
      Toast.show('✅ Produit mis à jour !');
    }
  } else {
    const newProduct = {
      id: 'p_' + Date.now(),
      name, game, sub, emoji, price, oldPrice, category, badge, hot, rating, reviews
    };
    products.unshift(newProduct);
    Toast.show('✅ Produit ajouté !');
  }
  Storage.setProducts(products);
  renderProductTable();
  renderAdminStats();
  resetForm();
}

function editProduct(id) {
  const product = Storage.getProducts().find(p => p.id === id);
  if (!product) return;
  editingId = id;

  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val ?? ''; };
  set('form-name',      product.name);
  set('form-sub',       product.sub);
  set('form-price',     product.price);
  set('form-old-price', product.oldPrice || '');
  set('form-category',  product.category);
  set('form-badge',     product.badge || '');
  set('form-rating',    product.rating);
  set('form-reviews',   product.reviews);
  set('form-emoji',     product.emoji);
  if (document.getElementById('form-hot')) document.getElementById('form-hot').checked = product.hot;
  // Update game select
  const gameSelect = document.getElementById('form-game');
  if (gameSelect) gameSelect.value = product.game;
  // Update emoji picker
  const emojiPicker = document.getElementById('emoji-picker');
  if (emojiPicker) {
    emojiPicker.querySelectorAll('.emoji-opt').forEach(o => {
      o.classList.toggle('selected', o.dataset.emoji === product.emoji);
    });
  }
  // Update form title & show form
  const titleEl = document.getElementById('form-title');
  if (titleEl) titleEl.textContent = '✏️ Modifier le produit';
  const formCard = document.getElementById('product-form-card');
  if (formCard) { formCard.style.display = 'block'; formCard.scrollIntoView({ behavior:'smooth', block:'start' }); }
}

function deleteProduct(id) {
  if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return;
  const products = Storage.getProducts().filter(p => p.id !== id);
  Storage.setProducts(products);
  renderProductTable();
  renderAdminStats();
  Toast.show('Produit supprimé.', 'warn');
}

function resetForm() {
  editingId = null;
  const form = document.getElementById('product-form');
  if (form) form.reset();
  const titleEl = document.getElementById('form-title');
  if (titleEl) titleEl.textContent = '➕ Ajouter un produit';
  const emojiPicker = document.getElementById('emoji-picker');
  if (emojiPicker) emojiPicker.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
}

/* ─── ORDERS ─────────────────────────────────── */
function renderAdminOrders() {
  const el     = document.getElementById('admin-orders-list');
  if (!el) return;
  const orders = Storage.getAllOrders();
  if (orders.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🛒</div><div class="empty-state-title">Aucune commande</div></div>`;
    return;
  }
  el.innerHTML = orders.map(o => `
    <div class="admin-order fade-in">
      <div>
        <div class="admin-order-id">${o.id}</div>
        <div class="admin-order-user">👤 ${o.userName} · ${o.userEmail}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">${new Date(o.date).toLocaleString('fr-FR')}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          ${o.items.map(i=>`<span class="badge badge-cat">${i.emoji} ${i.name.slice(0,25)}</span>`).join('')}
        </div>
      </div>
      <div style="text-align:right">
        <div class="admin-order-total">$${o.total.toFixed(2)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">via ${o.method === 'stripe' ? '💳 Stripe' : '🔵 PayPal'}</div>
        <div class="order-status" style="margin-top:6px;display:inline-flex">✓ ${o.status}</div>
      </div>
    </div>`).join('');
}

/* ─── USERS ──────────────────────────────────── */
function renderAdminUsers() {
  const el    = document.getElementById('admin-users-list');
  if (!el) return;
  const users = Object.values(Storage.getUsers()).filter(u => !u.isAdmin);
  if (users.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Aucun client inscrit</div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="products-table-wrap">
      <table class="products-table">
        <thead><tr><th>Client</th><th>Email</th><th>Inscription</th><th>Commandes</th><th>Dépenses</th></tr></thead>
        <tbody>
          ${users.map(u => {
            const orders  = Storage.getOrders(u.id);
            const spent   = orders.reduce((s, o) => s + o.total, 0);
            const since   = new Date(u.createdAt).toLocaleDateString('fr-FR');
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:8px">
                <div style="width:30px;height:30px;background:linear-gradient(135deg,var(--accent),var(--accent-dk));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#000">${u.name.slice(0,2).toUpperCase()}</div>
                <span style="font-weight:600;color:var(--text)">${u.name}</span>
              </div></td>
              <td>${u.email}</td>
              <td>${since}</td>
              <td>${orders.length}</td>
              <td style="color:var(--accent);font-family:Rajdhani,sans-serif;font-weight:700">$${spent.toFixed(2)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}
