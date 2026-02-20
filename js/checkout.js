/* checkout.js — Paiement réel Stripe + PayPal (via API MongoDB) */

let checkoutState = { method: null, step: 1, stripeInstance: null, stripeElements: null };

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('checkout'); renderFooter(); Toast.init();
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment_intent') && params.get('payment_intent_client_secret')) {
    handle3DSecureReturn(params); return;
  }
  initCheckout();
});

function initCheckout() {
  const cart    = API.getCart();
  const session = API.getSession();
  if (cart.length === 0) { showEmptyCart(); return; }
  if (!session)          { window.location.href = '/login?redirect=checkout'; return; }
  renderSummary(cart);
  renderStep(1);
  bindPaymentOptions();
  if (typeof Stripe !== 'undefined') checkoutState.stripeInstance = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
}

function renderSummary(cart) {
  const items = document.getElementById('summary-items');
  const totalEl = document.getElementById('summary-total');
  if (!items) return;
  const sum = cart.reduce((s,i) => s + i.price*(i.qty||1), 0);
  items.innerHTML = cart.map(i=>`
    <div class="summary-item">
      <span class="summary-item-emoji">${i.emoji}</span>
      <span class="summary-item-name">${i.name}</span>
      <span class="summary-item-price">$${(i.price*(i.qty||1)).toFixed(2)}</span>
    </div>`).join('');
  if (totalEl) totalEl.textContent = `$${sum.toFixed(2)}`;
}

function renderStep(step) {
  checkoutState.step = step;
  document.querySelectorAll('.step-bar').forEach((b,i) => b.classList.toggle('done', i < step));
  document.querySelectorAll('.checkout-step').forEach((s,i) => s.classList.toggle('active', i === step-1));
  document.querySelectorAll('.step-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('step-'+step);
  if (panel) { panel.style.display = 'block'; panel.classList.add('fade-in'); }
}

function bindPaymentOptions() {
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach(o=>o.classList.remove('selected'));
      opt.classList.add('selected');
      checkoutState.method = opt.dataset.method;
    });
  });
  document.getElementById('step1-continue')?.addEventListener('click', () => {
    if (!checkoutState.method) { Toast.show('Choisissez un mode de paiement.','error'); return; }
    renderStep(2); renderPaymentForm();
  });
}

async function renderPaymentForm() {
  const container = document.getElementById('payment-form-area');
  if (!container) return;
  document.getElementById('step2-back')?.addEventListener('click', () => { checkoutState.stripeElements=null; renderStep(1); });
  if (checkoutState.method === 'stripe') await renderStripeForm(container);
  else await renderPayPalForm(container);
}

async function renderStripeForm(container) {
  const cart  = API.getCart();
  const total = cart.reduce((s,i) => s+i.price*(i.qty||1), 0);
  const session = API.getSession();

  container.innerHTML = `
    <div class="card-ssl">🔒 Paiement sécurisé SSL — <strong>Powered by Stripe</strong></div>
    <div id="stripe-payment-element" style="min-height:60px;margin-bottom:20px">
      <div class="loading-center" style="padding:24px"><div class="spinner"></div></div>
    </div>
    <div id="stripe-error" style="color:var(--red);font-size:13px;margin-bottom:12px;min-height:16px"></div>`;

  const payBtn = document.getElementById('step2-continue');
  if (payBtn) payBtn.style.display = 'none';

  let clientSecret;
  try {
    const res = await fetch(CONFIG.BACKEND_URL + '/create-payment-intent', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ amount: total, currency:'usd', orderItems: cart, customerEmail: session?.email }),
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || 'HTTP '+res.status);
    clientSecret = (await res.json()).clientSecret;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">❌ <strong>Backend inaccessible</strong><br><small>${CONFIG.BACKEND_URL}</small></div>`;
    if (payBtn) payBtn.style.display = 'flex';
    return;
  }

  const stripe   = checkoutState.stripeInstance;
  const elements = stripe.elements({ clientSecret, appearance: { theme:'night', variables:{ colorPrimary:'#f0a500', colorBackground:'#161824', colorText:'#e8eaf0', colorDanger:'#ef4444', fontFamily:'Inter,sans-serif', borderRadius:'8px' } } });
  checkoutState.stripeElements = elements;
  const paymentEl = elements.create('payment', { layout:'tabs', wallets:{ applePay:'auto', googlePay:'auto' } });
  paymentEl.mount('#stripe-payment-element');

  paymentEl.on('ready', () => {
    if (!payBtn) return;
    payBtn.style.display = 'flex'; payBtn.textContent = `Payer $${total.toFixed(2)} →`;
    const btn = payBtn.cloneNode(true); payBtn.replaceWith(btn);
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = '⏳ Traitement…';
      document.getElementById('stripe-error').textContent = '';
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect:'if_required', confirmParams:{ return_url: CONFIG.SITE_URL+'/checkout' } });
      if (error) {
        document.getElementById('stripe-error').textContent = error.message;
        Toast.show(error.message,'error');
        btn.disabled = false; btn.textContent = `Payer $${total.toFixed(2)} →`;
      } else if (paymentIntent?.status === 'succeeded') {
        await finalizeOrder('stripe', paymentIntent.id);
      }
    });
  });
}

async function renderPayPalForm(container) {
  const cart  = API.getCart();
  const total = cart.reduce((s,i) => s+i.price*(i.qty||1), 0);

  container.innerHTML = `
    <p style="color:var(--dim);font-size:13px;text-align:center;margin-bottom:16px">Cliquez sur le bouton ci-dessous pour payer via PayPal.</p>
    <div id="paypal-button-container" style="max-width:380px;margin:0 auto">
      <div class="loading-center" style="padding:20px"><div class="spinner"></div></div>
    </div>`;
  document.getElementById('step2-continue').style.display = 'none';

  await loadPayPalSDK();
  if (!window.paypal) { document.getElementById('paypal-button-container').innerHTML = '<div class="alert alert-error">❌ PayPal SDK non chargé. Vérifiez PAYPAL_CLIENT_ID.</div>'; return; }

  window.paypal.Buttons({
    style: { layout:'vertical', color:'gold', shape:'rect', label:'pay', height:48 },
    createOrder: async () => {
      const res = await fetch(CONFIG.BACKEND_URL+'/create-paypal-order', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount:total, currency:'USD', items:cart }) });
      if (!res.ok) throw new Error('Erreur serveur');
      return (await res.json()).id;
    },
    onApprove: async (data) => {
      const res = await fetch(CONFIG.BACKEND_URL+'/capture-paypal-order/'+data.orderID, { method:'POST', headers:{'Content-Type':'application/json'} });
      const capture = await res.json();
      if (capture.status === 'COMPLETED') await finalizeOrder('paypal', data.orderID);
      else Toast.show('Erreur PayPal','error');
    },
    onError:  (err) => { console.error(err); Toast.show('Erreur PayPal. Réessayez.','error'); },
    onCancel: () => Toast.show('Paiement annulé.','warn'),
  }).render('#paypal-button-container');
}

function loadPayPalSDK() {
  return new Promise(resolve => {
    if (window.paypal) { resolve(); return; }
    if (document.getElementById('paypal-sdk')) { const c=setInterval(()=>{ if(window.paypal){clearInterval(c);resolve();} },150); return; }
    const s = document.createElement('script');
    s.id='paypal-sdk'; s.src=`https://www.paypal.com/sdk/js?client-id=${CONFIG.PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
    s.onload=resolve; s.onerror=()=>resolve(); document.head.appendChild(s);
  });
}

async function finalizeOrder(method, transactionId) {
  const session = API.getSession();
  const cart    = API.getCart();
  const total   = cart.reduce((s,i) => s+i.price*(i.qty||1), 0);
  const orderId = 'ORD-'+Math.random().toString(36).slice(2,8).toUpperCase();

  try {
    await API.saveOrder({ orderId, transactionId, items: cart, total, method });
  } catch (e) {
    console.warn('Impossible de sauvegarder via API:', e.message);
  }

  API.clearCart();
  showSuccess({ orderId, total, method }, session);
}

async function handle3DSecureReturn(params) {
  renderHeader('checkout'); renderFooter();
  if (typeof Stripe === 'undefined') return;
  const stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
  const { paymentIntent } = await stripe.retrievePaymentIntent(params.get('payment_intent_client_secret'));
  const session = API.getSession();
  if (paymentIntent?.status === 'succeeded' && session) await finalizeOrder('stripe', paymentIntent.id);
  else document.getElementById('checkout-main-content').innerHTML = '<div class="alert alert-error" style="max-width:520px;margin:40px auto">❌ Paiement 3D Secure échoué. <a href="/checkout" style="color:var(--accent)">Réessayer</a></div>';
}

function showSuccess(order, session) {
  const main = document.getElementById('checkout-main-content');
  if (!main) return;
  main.innerHTML = `
    <div class="checkout-success fade-in">
      <div class="checkout-success-icon">✅</div>
      <div class="checkout-success-title">Paiement accepté !</div>
      <div class="checkout-success-sub">
        Votre commande a bien été enregistrée.<br>
        Les identifiants seront envoyés à <strong style="color:var(--accent)">${session?.email||''}</strong> dans les prochaines minutes.
      </div>
      <div class="checkout-order-id">${order.orderId}</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="/account" class="btn btn-gold btn-lg">Voir mes commandes →</a>
        <a href="/shop"    class="btn btn-ghost btn-lg">Continuer les achats</a>
      </div>
    </div>`;
  Toast.show('✅ Commande '+order.orderId+' confirmée !');
}

function showEmptyCart() {
  const main = document.getElementById('checkout-main-content');
  if (!main) return;
  main.innerHTML = `
    <div class="checkout-empty">
      <div class="checkout-empty-icon">🛒</div>
      <h2 style="font-family:Rajdhani,sans-serif;font-size:22px;color:var(--dim);margin-bottom:8px">Panier vide</h2>
      <a href="/shop" class="btn btn-gold btn-lg">Parcourir la boutique →</a>
    </div>`;
}
