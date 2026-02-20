/* admin.js — IDs corrects selon admin.html */
const GAMES  = ['Dokkan Battle','Genshin Impact','Dragon Ball Legends','Honkai Star Rail','Zenless Zone Zero','One Piece','FGO','Wuthering Waves'];
const EMOJIS = ['🐉','⚔️','🔥','🌌','⚡','⚓','✨','🌊','💎','👑','🎯','🏆','⭐','💫','🎮'];

let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  renderHeader('admin'); renderFooter(); Toast.init();

  // ── Affichage immédiat des produits (localStorage) ─────
  loadProducts();
  bindTabs();
  bindProductForm();

  // ── Stats API en arrière-plan (non-bloquant) ───────────
  loadStatsAsync();
});

/* ── STATS (async, non-bloquant) ──────────────────────── */
async function loadStatsAsync() {
  const statEls = document.querySelectorAll('#admin-stats .admin-stat-value');
  if (statEls[0]) statEls[0].textContent = Storage.getProducts().length;

  try {
    const [orders, users] = await Promise.all([
      Promise.race([API.getAllOrders(),   new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),8000))]),
      Promise.race([API.getAllUsers(),     new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),8000))]),
    ]);
    const rev = orders.reduce((s,o) => s+o.total, 0);
    if (statEls[1]) statEls[1].textContent = orders.length;
    if (statEls[2]) statEls[2].textContent = '$'+rev.toFixed(2);
    if (statEls[3]) statEls[3].textContent = users.length;
  } catch (e) {
    console.warn('[admin stats]', e.message);
    // Garder les … si erreur
  }
}

/* ── TABS ────────────────────────────────────────────── */
function bindTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      document.querySelectorAll('.admin-panel').forEach(p => p.style.display='none');
      document.getElementById('admin-panel-' + name).style.display = 'block';
      if (name === 'orders') await loadOrders();
      if (name === 'users')  await loadUsers();
      if (name === 'products') loadProducts();
    });
  });
}

/* ── PRODUCTS (localStorage — synchrone) ─────────────── */
function loadProducts() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  const products = Storage.getProducts();
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted)">Aucun produit</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td style="font-size:22px;width:40px">${p.emoji}</td>
      <td>
        <div style="font-weight:600;color:var(--text);font-size:13px">${p.name}</div>
        <div style="color:var(--muted);font-size:11px">${p.game}</div>
      </td>
      <td><span class="badge badge-cat">${p.category}</span>${p.hot?'🔥':''}</td>
      <td style="color:var(--accent);font-family:'Rajdhani',sans-serif;font-weight:700">$${p.price.toFixed(2)}</td>
      <td style="color:var(--muted);font-size:12px">★${p.rating} (${p.reviews})</td>
      <td>
        <button class="btn btn-ghost btn-sm" style="margin-right:6px" onclick="editProduct('${p.id}')">✏️</button>
        <button class="btn btn-sm" style="background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.2)" onclick="deleteProduct('${p.id}')">🗑</button>
      </td>
    </tr>`).join('');
}

/* ── ORDERS (API) ────────────────────────────────────── */
async function loadOrders() {
  const el = document.getElementById('admin-orders-list');
  if (!el) return;
  el.innerHTML = `<div class="loading-center" style="padding:30px"><div class="spinner"></div></div>`;
  try {
    const orders = await Promise.race([
      API.getAllOrders(),
      new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),8000))
    ]);
    if (!orders.length) { el.innerHTML=`<p style="text-align:center;color:var(--muted);padding:30px">Aucune commande</p>`; return; }
    el.innerHTML = `<table class="products-table"><thead><tr>
      <th>ID</th><th>Client</th><th>Email</th><th>Articles</th><th>Total</th><th>Date</th>
    </tr></thead><tbody>${orders.map(o=>`<tr>
      <td style="color:var(--accent);font-weight:600;font-size:12px">${o.orderId}</td>
      <td>${o.userId?.name||'—'}</td>
      <td style="color:var(--muted);font-size:12px">${o.userId?.email||'—'}</td>
      <td style="font-size:12px">${o.items.map(i=>i.emoji+' '+i.name.slice(0,18)).join(', ')}</td>
      <td style="color:var(--accent);font-weight:700">$${o.total.toFixed(2)}</td>
      <td style="color:var(--muted);font-size:12px">${new Date(o.createdAt||o.date).toLocaleDateString('fr-FR')}</td>
    </tr>`).join('')}</tbody></table>`;
  } catch(e) {
    el.innerHTML = `<p style="text-align:center;color:var(--red);padding:20px">⚠️ Impossible de charger les commandes (${e.message})</p>`;
  }
}

/* ── USERS (API) ─────────────────────────────────────── */
async function loadUsers() {
  const el = document.getElementById('admin-users-list');
  if (!el) return;
  el.innerHTML = `<div class="loading-center" style="padding:30px"><div class="spinner"></div></div>`;
  try {
    const users = await Promise.race([
      API.getAllUsers(),
      new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),8000))
    ]);
    if (!users.length) { el.innerHTML=`<p style="text-align:center;color:var(--muted);padding:30px">Aucun client</p>`; return; }
    el.innerHTML = `<table class="products-table"><thead><tr>
      <th>Client</th><th>Email</th><th>Inscrit le</th>
    </tr></thead><tbody>${users.map(u=>`<tr>
      <td><div style="display:inline-flex;align-items:center;gap:10px">
        <div class="user-avatar" style="width:30px;height:30px;font-size:11px">${u.name.slice(0,2).toUpperCase()}</div>${u.name}
      </div></td>
      <td style="color:var(--muted)">${u.email}</td>
      <td style="color:var(--muted);font-size:12px">${new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
    </tr>`).join('')}</tbody></table>`;
  } catch(e) {
    el.innerHTML = `<p style="text-align:center;color:var(--red);padding:20px">⚠️ Impossible de charger les clients (${e.message})</p>`;
  }
}

/* ── PRODUCT FORM ────────────────────────────────────── */
function bindProductForm() {
  // Populate game select
  const gameSelect = document.getElementById('form-game');
  if (gameSelect) gameSelect.innerHTML = GAMES.map(g=>`<option value="${g}">${g}</option>`).join('');

  // Emoji picker
  const picker = document.getElementById('emoji-picker');
  if (picker) {
    picker.innerHTML = EMOJIS.map(e=>`<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`).join('');
    picker.querySelectorAll('.emoji-btn').forEach(b => b.addEventListener('click', () => {
      document.getElementById('form-emoji').value = b.dataset.emoji;
      picker.querySelectorAll('.emoji-btn').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');
    }));
  }

  // Open form
  document.getElementById('show-add-form')?.addEventListener('click', () => {
    editingId = null;
    resetForm();
    document.getElementById('product-form-card').style.display = 'block';
    document.getElementById('form-name').focus();
  });

  // Cancel
  document.getElementById('form-cancel')?.addEventListener('click', () => {
    document.getElementById('product-form-card').style.display = 'none';
    editingId = null;
  });

  // Submit
  document.getElementById('product-form')?.addEventListener('submit', saveProduct);
}

function resetForm() {
  document.getElementById('product-form')?.reset();
  document.getElementById('form-emoji').value = '🎮';
  document.getElementById('form-title').textContent = '➕ Ajouter un produit';
  document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('selected'));
}

function editProduct(id) {
  const p = Storage.getProducts().find(x=>x.id===id);
  if (!p) return;
  editingId = id;
  document.getElementById('form-title').textContent = '✏️ Modifier le produit';
  document.getElementById('form-name').value       = p.name;
  document.getElementById('form-sub').value        = p.sub;
  document.getElementById('form-game').value       = p.game;
  document.getElementById('form-price').value      = p.price;
  document.getElementById('form-old-price').value  = p.oldPrice || '';
  document.getElementById('form-category').value   = p.category;
  document.getElementById('form-badge').value      = p.badge || '';
  document.getElementById('form-rating').value     = p.rating;
  document.getElementById('form-reviews').value    = p.reviews;
  document.getElementById('form-hot').checked      = p.hot;
  document.getElementById('form-emoji').value      = p.emoji;
  // Highlight emoji btn
  document.querySelectorAll('.emoji-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.emoji === p.emoji);
  });
  document.getElementById('product-form-card').style.display = 'block';
  document.getElementById('product-form-card').scrollIntoView({ behavior:'smooth' });
}

function deleteProduct(id) {
  if (!confirm('Supprimer ce produit définitivement ?')) return;
  const products = Storage.getProducts().filter(p=>p.id!==id);
  Storage.setProducts(products);
  loadProducts();
  loadStatsAsync();
  Toast.show('Produit supprimé', 'warn');
}

function saveProduct(e) {
  e.preventDefault();
  const g = id => document.getElementById(id)?.value.trim();
  const product = {
    id:        editingId || 'p_'+Date.now(),
    name:      g('form-name'),
    sub:       g('form-sub'),
    game:      g('form-game'),
    price:     parseFloat(g('form-price'))||0,
    oldPrice:  parseFloat(g('form-old-price'))||null,
    category:  g('form-category')||'starter',
    badge:     g('form-badge')||null,
    hot:       document.getElementById('form-hot')?.checked||false,
    rating:    parseFloat(g('form-rating'))||5,
    reviews:   parseInt(g('form-reviews'))||0,
    emoji:     g('form-emoji')||'🎮',
  };
  if (!product.name) { Toast.show('Le nom est requis','error'); return; }
  const products = Storage.getProducts();
  if (editingId) {
    const idx = products.findIndex(p=>p.id===editingId);
    if (idx>=0) products[idx]=product;
  } else {
    products.unshift(product);
  }
  Storage.setProducts(products);
  loadProducts();
  loadStatsAsync();
  document.getElementById('product-form-card').style.display = 'none';
  editingId = null;
  Toast.show(editingId ? 'Produit mis à jour ✅' : 'Produit ajouté ✅');
}
