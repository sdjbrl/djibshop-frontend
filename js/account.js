/* account.js — Espace client (via API) */
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  renderHeader('account'); renderFooter(); Toast.init();

  const session = API.getSession();
  document.getElementById('acc-avatar').textContent = session.name.slice(0,2).toUpperCase();
  document.getElementById('acc-name').textContent   = session.name;
  document.getElementById('acc-email').textContent  = session.email;
  document.getElementById('acc-since').textContent  =
    new Date(session.createdAt).toLocaleDateString('fr-FR',{year:'numeric',month:'long'});

  let orders = [];
  try { orders = await API.getMyOrders(); } catch (e) { console.warn(e); }

  const total = orders.reduce((s,o)=>s+o.total,0);
  const items = orders.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+(i.qty||1),0),0);
  document.getElementById('acc-orders').textContent   = orders.length;
  document.getElementById('acc-spent').textContent    = '$'+total.toFixed(2);
  document.getElementById('acc-items').textContent    = items;
  document.getElementById('acc-status').textContent   = orders.length ? 'Client fidèle' : 'Nouveau';

  renderOrders(orders);
  document.getElementById('logout-btn')?.addEventListener('click', () => { API.clearSession(); window.location.href='/'; });
});

function renderOrders(orders) {
  const el = document.getElementById('orders-list');
  if (!el) return;
  if (!orders.length) {
    el.innerHTML=`<div class="orders-empty"><div style="font-size:48px;margin-bottom:12px">📦</div><p style="color:var(--muted)">Aucune commande pour le moment.</p><a href="/shop" class="btn btn-gold" style="margin-top:12px">Parcourir la boutique →</a></div>`; return;
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
        ${o.items.map(i=>`<span class="order-item-chip">${i.emoji} ${i.name.slice(0,35)}</span>`).join('')}
      </div>
    </div>`).join('');
}
