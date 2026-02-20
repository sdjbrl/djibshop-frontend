/* admin.js — Panneau Admin (via API) */
const GAMES = ['Dokkan Battle','Genshin Impact','Dragon Ball Legends','Honkai Star Rail','Zenless Zone Zero','One Piece','FGO','Wuthering Waves'];
const EMOJIS = ['🐉','⚔️','🔥','🌌','⚡','⚓','✨','🌊','💎','👑','🎯','🏆','⭐','💫','🎮'];

let adminState = { tab:'products', editId: null };

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  renderHeader('admin'); renderFooter(); Toast.init();
  await loadStats();
  await loadProducts();
  bindTabs();
  bindProductForm();
});

async function loadStats() {
  const products = Storage.getProducts();
  document.getElementById('stat-products').textContent = products.length;
  try {
    const orders = await API.getAllOrders();
    const users  = await API.getAllUsers();
    const rev    = orders.reduce((s,o)=>s+o.total,0);
    document.getElementById('stat-orders').textContent  = orders.length;
    document.getElementById('stat-revenue').textContent = '$'+rev.toFixed(2);
    document.getElementById('stat-users').textContent   = users.length;
  } catch(e) { console.warn(e); }
}

function bindTabs() {
  document.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', async () => {
    document.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    adminState.tab = t.dataset.tab;
    document.querySelectorAll('.admin-panel').forEach(p=>p.style.display='none');
    document.getElementById('panel-'+adminState.tab).style.display='block';
    if (adminState.tab === 'orders') await loadOrders();
    if (adminState.tab === 'users')  await loadUsers();
    if (adminState.tab === 'products') loadProducts();
  }));
}

function loadProducts() {
  const products = Storage.getProducts();
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  tbody.innerHTML = products.map(p=>`
    <tr>
      <td>${p.emoji} ${p.name}</td>
      <td>${p.game}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td><span class="badge badge-${p.badge||'cat'}">${p.badge||p.category}</span>${p.hot?'🔥':''}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Éditer</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Suppr.</button>
      </td>
    </tr>`).join('');
}

async function loadOrders() {
  const el = document.getElementById('orders-tbody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Chargement…</td></tr>';
  try {
    const orders = await API.getAllOrders();
    el.innerHTML = orders.length ? orders.map(o=>`
      <tr>
        <td style="color:var(--accent);font-weight:600">${o.orderId}</td>
        <td>${o.userId?.name||'—'}</td>
        <td style="color:var(--muted);font-size:12px">${o.userId?.email||'—'}</td>
        <td>${o.items.map(i=>i.emoji+' '+i.name.slice(0,20)).join(', ')}</td>
        <td style="color:var(--accent);font-weight:700">$${o.total.toFixed(2)}</td>
        <td>${new Date(o.createdAt||o.date).toLocaleDateString('fr-FR')}</td>
      </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Aucune commande</td></tr>';
  } catch(e) { el.innerHTML = `<tr><td colspan="6" style="color:var(--red)">${e.message}</td></tr>`; }
}

async function loadUsers() {
  const el = document.getElementById('users-tbody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Chargement…</td></tr>';
  try {
    const users = await API.getAllUsers();
    el.innerHTML = users.length ? users.map(u=>`
      <tr>
        <td><div class="user-avatar" style="display:inline-flex">${u.name.slice(0,2).toUpperCase()}</div> ${u.name}</td>
        <td style="color:var(--muted)">${u.email}</td>
        <td>${new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
      </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Aucun utilisateur</td></tr>';
  } catch(e) { el.innerHTML = `<tr><td colspan="5" style="color:var(--red)">${e.message}</td></tr>`; }
}

function bindProductForm() {
  const form = document.getElementById('product-form');
  if (!form) return;
  // Populate game select
  const gs = document.getElementById('pf-game');
  if (gs) gs.innerHTML = GAMES.map(g=>`<option value="${g}">${g}</option>`).join('');
  // Emoji picker
  const ep = document.getElementById('emoji-picker');
  if (ep) ep.innerHTML = EMOJIS.map(e=>`<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`).join('');
  ep?.querySelectorAll('.emoji-btn').forEach(b=>b.addEventListener('click',()=>{
    document.getElementById('pf-emoji').value=b.dataset.emoji;
    document.getElementById('pf-emoji-preview').textContent=b.dataset.emoji;
    ep.querySelectorAll('.emoji-btn').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected');
  }));
  document.getElementById('add-product-btn')?.addEventListener('click',()=>{ adminState.editId=null; resetForm(); showForm(); });
  document.getElementById('cancel-product-btn')?.addEventListener('click', hideForm);
  form.addEventListener('submit', saveProduct);
}

function showForm(){ document.getElementById('product-form-wrap')?.style.setProperty('display','block'); }
function hideForm(){ document.getElementById('product-form-wrap')?.style.setProperty('display','none'); adminState.editId=null; }
function resetForm(){ document.getElementById('product-form')?.reset(); document.getElementById('pf-emoji').value='🎮'; document.getElementById('pf-emoji-preview').textContent='🎮'; document.getElementById('form-title').textContent='Nouveau produit'; }

function editProduct(id) {
  const p = Storage.getProducts().find(x=>x.id===id);
  if (!p) return;
  adminState.editId = id;
  document.getElementById('form-title').textContent='Modifier le produit';
  document.getElementById('pf-name').value       = p.name;
  document.getElementById('pf-sub').value        = p.sub;
  document.getElementById('pf-game').value       = p.game;
  document.getElementById('pf-price').value      = p.price;
  document.getElementById('pf-old-price').value  = p.oldPrice||'';
  document.getElementById('pf-category').value   = p.category;
  document.getElementById('pf-badge').value      = p.badge||'';
  document.getElementById('pf-hot').checked      = p.hot;
  document.getElementById('pf-rating').value     = p.rating;
  document.getElementById('pf-reviews').value    = p.reviews;
  document.getElementById('pf-emoji').value      = p.emoji;
  document.getElementById('pf-emoji-preview').textContent = p.emoji;
  showForm();
}

function deleteProduct(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  const products = Storage.getProducts().filter(p=>p.id!==id);
  Storage.setProducts(products);
  loadProducts();
  Toast.show('Produit supprimé', 'warn');
}

function saveProduct(e) {
  e.preventDefault();
  const f = id => document.getElementById(id)?.value.trim();
  const product = {
    id:        adminState.editId || 'p_'+Date.now(),
    name:      f('pf-name'),
    sub:       f('pf-sub'),
    game:      f('pf-game'),
    price:     parseFloat(f('pf-price'))||0,
    oldPrice:  parseFloat(f('pf-old-price'))||null,
    category:  f('pf-category')||'starter',
    badge:     f('pf-badge')||null,
    hot:       document.getElementById('pf-hot')?.checked||false,
    rating:    parseFloat(f('pf-rating'))||5,
    reviews:   parseInt(f('pf-reviews'))||0,
    emoji:     f('pf-emoji')||'🎮',
  };
  if (!product.name) { Toast.show('Nom requis','error'); return; }
  const products = Storage.getProducts();
  if (adminState.editId) {
    const idx = products.findIndex(p=>p.id===adminState.editId);
    if (idx>=0) products[idx]=product;
  } else { products.unshift(product); }
  Storage.setProducts(products);
  loadProducts();
  hideForm();
  Toast.show(adminState.editId ? 'Produit mis à jour ✅' : 'Produit ajouté ✅');
  loadStats();
}
