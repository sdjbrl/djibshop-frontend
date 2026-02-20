/* account.js — IDs corrects selon account.html */
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  renderHeader('account'); renderFooter(); Toast.init();

  const session = API.getSession();

  // ── Affichage immédiat depuis la session ───────────────
  document.getElementById('account-welcome').textContent = `Bonjour, ${session.name} 👋`;
  document.getElementById('account-email').textContent   = session.email;

  // Profile card
  const profileCard = document.getElementById('profile-card');
  if (profileCard) {
    profileCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:18px;padding:4px">
        <div class="user-avatar" style="width:54px;height:54px;font-size:20px;flex-shrink:0">
          ${session.name.slice(0,2).toUpperCase()}
        </div>
        <div>
          <div style="font-family:'Rajdhani',sans-serif;font-weight:800;font-size:20px;color:var(--text)">${session.name}</div>
          <div style="color:var(--muted);font-size:13px">${session.email}</div>
          <div style="color:var(--muted);font-size:12px;margin-top:2px">
            Membre depuis ${new Date(session.createdAt || Date.now()).toLocaleDateString('fr-FR',{year:'numeric',month:'long'})}
          </div>
        </div>
        <button id="logout-btn" class="btn btn-ghost btn-sm" style="margin-left:auto">🚪 Déconnexion</button>
      </div>`;
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      API.clearSession();
      window.location.href = '/';
    });
  }

  // Stats (4 cartes : .stat-card .stat-value dans account.html)
  const statCards = document.querySelectorAll('#account-stats .stat-card');
  const setStats = (orders) => {
    const total  = orders.reduce((s,o) => s + o.total, 0);
    const items  = orders.reduce((s,o) => s + o.items.reduce((ss,i) => ss+(i.qty||1),0), 0);
    const data   = [
      { emoji:'📦', value: orders.length, label:'Commandes' },
      { emoji:'💰', value: '$'+total.toFixed(2), label:'Dépensé' },
      { emoji:'🎮', value: items, label:'Articles' },
      { emoji:'⭐', value: orders.length ? 'Fidèle' : 'Nouveau', label:'Statut' },
    ];
    data.forEach((d, i) => {
      if (!statCards[i]) return;
      statCards[i].querySelector('.stat-emoji').textContent  = d.emoji;
      statCards[i].querySelector('.stat-value').textContent  = d.value;
      statCards[i].querySelector('.stat-label').textContent  = d.label;
    });
  };
  setStats([]); // valeurs initiales à 0

  // ── Tabs ───────────────────────────────────────────────
  document.querySelectorAll('.account-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).style.display = 'block';
    });
  });

  // ── Chargement des commandes (non-bloquant) ─────────────
  let orders = [];
  try {
    orders = await Promise.race([
      API.getMyOrders(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
    ]);
    setStats(orders);
    renderOrders(orders);
  } catch (e) {
    console.warn('[account] orders:', e.message);
    renderOrders([]);
  }

  // ── Profil panel ───────────────────────────────────────
  const profileInfo = document.getElementById('profile-info');
  if (profileInfo) {
    profileInfo.innerHTML = `
      <div class="card" style="padding:24px;max-width:480px">
        <h3 style="font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;margin-bottom:16px">Mes informations</h3>
        <div class="form-group">
          <label>Nom</label>
          <div class="form-control" style="cursor:default;opacity:.7">${session.name}</div>
        </div>
        <div class="form-group">
          <label>Email</label>
          <div class="form-control" style="cursor:default;opacity:.7">${session.email}</div>
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <a href="/forgot-password" class="btn btn-ghost btn-sm" style="display:inline-flex">🔑 Changer mon mot de passe</a>
        </div>
      </div>`;
  }
});

function renderOrders(orders) {
  const el = document.getElementById('orders-list');
  if (!el) return;

  if (!orders.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--muted)">
        <div style="font-size:48px;margin-bottom:12px">📦</div>
        <p>Aucune commande pour le moment.</p>
        <a href="/shop" class="btn btn-gold" style="margin-top:14px;display:inline-flex">Parcourir la boutique →</a>
      </div>`;
    return;
  }

  el.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <span class="order-id">${o.orderId}</span>
          <span class="order-date">${new Date(o.createdAt||o.date).toLocaleDateString('fr-FR')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="order-total">$${o.total.toFixed(2)}</span>
          <span class="badge badge-instant">✅ ${o.status||'Livré'}</span>
        </div>
      </div>
      <div class="order-items">
        ${o.items.map(i => `<span class="order-item-chip">${i.emoji} ${i.name.slice(0,35)}</span>`).join('')}
      </div>
    </div>`).join('');
}
