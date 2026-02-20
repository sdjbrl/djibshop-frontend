/* ══════════════════════════════════════════════
   account.js — Account Page Logic
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth('/login')) return;

  renderHeader('account');
  renderFooter();
  Toast.init();

  const user = Storage.getSession();
  initAccount(user);
});

function initAccount(user) {
  renderProfileCard(user);
  renderStats(user);
  initTabs();
  bindLogout();
}

function renderProfileCard(user) {
  const el = document.getElementById('profile-card');
  if (!el) return;
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const since    = new Date(user.createdAt).toLocaleDateString('fr-FR', { year:'numeric', month:'long' });
  el.innerHTML = `
    <div class="profile-avatar">${initials}</div>
    <div class="profile-info">
      <div class="profile-name">${user.name}</div>
      <div class="profile-meta">${user.email}</div>
      <div class="profile-badge">📅 Membre depuis ${since}</div>
    </div>
    ${user.isAdmin ? '<span class="badge badge-premium" style="margin-left:auto">⚙️ Admin</span>' : ''}`;
}

function renderStats(user) {
  const orders   = Storage.getOrders(user.id);
  const total    = orders.reduce((s, o) => s + o.total, 0);
  const items    = orders.reduce((s, o) => s + o.items.length, 0);

  const statsEl = document.getElementById('account-stats');
  if (!statsEl) return;
  statsEl.innerHTML = [
    ['🛒', orders.length, 'Commandes'],
    ['💰', '$' + total.toFixed(2), 'Dépenses totales'],
    ['📦', items, 'Articles achetés'],
    ['⭐', orders.length > 5 ? 'VIP' : 'Standard', 'Statut'],
  ].map(([e, v, l]) => `
    <div class="stat-card">
      <div class="stat-emoji">${e}</div>
      <div class="stat-value">${v}</div>
      <div class="stat-label">${l}</div>
    </div>`).join('');
}

function initTabs() {
  const tabs = document.querySelectorAll('.account-tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const panel = document.getElementById('panel-' + tab.dataset.tab);
      if (panel) { panel.style.display = 'block'; panel.classList.add('fade-in'); }
      if (tab.dataset.tab === 'orders') renderOrders();
      if (tab.dataset.tab === 'profile') renderProfileInfo();
    });
  });
  // default: orders
  renderOrders();
}

function renderOrders() {
  const user   = Storage.getSession();
  const orders = Storage.getOrders(user.id);
  const el     = document.getElementById('orders-list');
  if (!el) return;

  if (orders.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <div class="empty-state-title">Aucune commande</div>
      <div class="empty-state-sub">Parcourez la boutique pour trouver votre prochain compte !</div>
      <a href="/shop" class="btn btn-gold" style="margin-top:16px">Aller à la boutique →</a>
    </div>`;
    return;
  }

  el.innerHTML = orders.map(order => `
    <div class="order-card fade-in">
      <div class="order-header">
        <div>
          <div class="order-id">${order.id}</div>
          <div class="order-date">${new Date(order.date).toLocaleString('fr-FR')}</div>
        </div>
        <div style="text-align:right">
          <div class="order-status">✓ ${order.status}</div>
          <div class="order-total">$${order.total.toFixed(2)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">via ${order.method === 'stripe' ? '💳 Stripe' : '🔵 PayPal'}</div>
        </div>
      </div>
      <div class="order-items">
        ${order.items.map(i => `
          <div class="order-item">
            <span class="order-item-emoji">${i.emoji}</span>
            <div class="order-item-info">
              <div class="order-item-name">${i.name}</div>
              <div class="order-item-game">${i.game}</div>
            </div>
            <span class="order-item-price">$${i.price.toFixed(2)}</span>
          </div>`).join('')}
      </div>
      <div class="order-delivery-note">
        📧 Identifiants envoyés à ${user.email}
      </div>
    </div>`).join('');
}

function renderProfileInfo() {
  const user = Storage.getSession();
  const el   = document.getElementById('profile-info');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:22px">
      <h3 style="font-family:Rajdhani,sans-serif;font-size:18px;color:var(--text);margin-bottom:18px">Informations du compte</h3>
      <div style="display:grid;gap:14px">
        ${[['Nom', user.name],['Email', user.email],['Rôle', user.isAdmin ? 'Administrateur':'Client'],['Membre depuis', new Date(user.createdAt).toLocaleDateString('fr-FR')]].map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--muted);font-size:13px">${k}</span>
            <span style="color:var(--text);font-weight:600;font-size:13px">${v}</span>
          </div>`).join('')}
      </div>
      <button onclick="logout()" class="btn btn-danger" style="margin-top:20px;width:100%">
        🚪 Se déconnecter
      </button>
    </div>`;
}

function bindLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', logout);
}
