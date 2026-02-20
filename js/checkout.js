/* ══════════════════════════════════════════════
   checkout.js — Paiement Réel (Stripe + PayPal)
   Configuration dans js/config.js
   ══════════════════════════════════════════════ */

let checkoutState = {
  method:         null,
  step:           1,
  stripeInstance: null,
  stripeElements: null,
};

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('checkout');
  renderFooter();
  Toast.init();

  // Retour après redirection Stripe 3D Secure
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment_intent') && params.get('payment_intent_client_secret')) {
    handle3DSecureReturn(params);
    return;
  }

  initCheckout();
});

/* ─── INIT ───────────────────────────────────── */
function initCheckout() {
  const cart    = Storage.getCart();
  const session = Storage.getSession();

  if (cart.length === 0) { showEmptyCart(); return; }
  if (!session)          { window.location.href = '/login?redirect=checkout'; return; }

  renderSummary(cart);
  renderStep(1);
  bindPaymentOptions();

  // Pré-charger l'instance Stripe
  if (typeof Stripe !== 'undefined') {
    checkoutState.stripeInstance = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
  } else {
    console.error('Stripe.js non chargé. Vérifiez le script dans <head>.');
  }
}

/* ─── SUMMARY ────────────────────────────────── */
function renderSummary(cart) {
  const items   = document.getElementById('summary-items');
  const totalEl = document.getElementById('summary-total');
  if (!items) return;
  const sum = cart.reduce((s, i) => s + i.price * i.qty, 0);
  items.innerHTML = cart.map(i => `
    <div class="summary-item">
      <span class="summary-item-emoji">${i.emoji}</span>
      <span class="summary-item-name">${i.name}</span>
      <span class="summary-item-price">$${(i.price * i.qty).toFixed(2)}</span>
    </div>`).join('');
  if (totalEl) totalEl.textContent = `$${sum.toFixed(2)}`;
}

/* ─── STEPS ──────────────────────────────────── */
function renderStep(step) {
  checkoutState.step = step;
  document.querySelectorAll('.step-bar').forEach((bar, i) => bar.classList.toggle('done', i < step));
  document.querySelectorAll('.checkout-step').forEach((s, i) => s.classList.toggle('active', i === step - 1));
  document.querySelectorAll('.step-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('step-' + step);
  if (panel) { panel.style.display = 'block'; panel.classList.add('fade-in'); }
}

/* ─── PAYMENT OPTIONS ────────────────────────── */
function bindPaymentOptions() {
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      checkoutState.method = opt.dataset.method;
    });
  });
  document.getElementById('step1-continue')?.addEventListener('click', () => {
    if (!checkoutState.method) { Toast.show('Veuillez choisir un mode de paiement.', 'error'); return; }
    renderStep(2);
    renderPaymentForm();
  });
}

/* ─── PAYMENT FORM ROUTER ────────────────────── */
async function renderPaymentForm() {
  const container = document.getElementById('payment-form-area');
  if (!container) return;

  // Bouton retour
  document.getElementById('step2-back')?.addEventListener('click', () => {
    checkoutState.stripeElements = null;
    renderStep(1);
  });

  if (checkoutState.method === 'stripe') {
    await renderStripeForm(container);
  } else {
    await renderPayPalForm(container);
  }
}

/* ══════════════════════════════════════════════
   STRIPE ELEMENTS
   ══════════════════════════════════════════════ */
async function renderStripeForm(container) {
  const cart  = Storage.getCart();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  container.innerHTML = `
    <div class="card-ssl">
      🔒 Paiement sécurisé SSL — <strong>Powered by Stripe</strong>
    </div>
    <div id="stripe-payment-element" style="min-height:60px;margin-bottom:20px">
      <div class="loading-center" style="padding:24px"><div class="spinner"></div></div>
    </div>
    <div id="stripe-error" style="color:var(--red);font-size:13px;margin-bottom:12px;min-height:16px"></div>`;

  const payBtn = document.getElementById('step2-continue');
  if (payBtn) payBtn.style.display = 'none';

  // 1. Créer le PaymentIntent côté serveur (Railway)
  let clientSecret;
  try {
    const res = await fetch(CONFIG.BACKEND_URL + '/create-payment-intent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: total, currency: 'usd', orderItems: cart }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur HTTP ' + res.status);
    }

    const data = await res.json();
    clientSecret = data.clientSecret;
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-error">
        ❌ <strong>Connexion au backend impossible</strong><br>
        <small style="opacity:.8">Backend : <code>${CONFIG.BACKEND_URL}</code><br>
        Vérifiez que Railway est démarré et que FRONTEND_URL est bien configuré.</small>
      </div>`;
    if (payBtn) payBtn.style.display = 'flex';
    return;
  }

  // 2. Stripe Elements avec thème sombre
  const stripe   = checkoutState.stripeInstance;
  const elements = stripe.elements({
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary:    '#f0a500',
        colorBackground: '#161824',
        colorText:       '#e8eaf0',
        colorDanger:     '#ef4444',
        fontFamily:      'Inter, sans-serif',
        borderRadius:    '8px',
        spacingUnit:     '4px',
      },
    },
  });
  checkoutState.stripeElements = elements;

  const paymentEl = elements.create('payment', {
    layout: 'tabs',
    wallets: { applePay: 'auto', googlePay: 'auto' },
  });
  paymentEl.mount('#stripe-payment-element');

  // 3. Afficher le bouton quand Stripe est prêt
  paymentEl.on('ready', () => {
    if (!payBtn) return;
    payBtn.style.display = 'flex';
    payBtn.textContent   = `Payer $${total.toFixed(2)} →`;

    // Clone pour éviter les doublons d'event listeners
    const btn = payBtn.cloneNode(true);
    payBtn.replaceWith(btn);

    btn.addEventListener('click', async () => {
      btn.disabled    = true;
      btn.textContent = '⏳ Traitement…';
      document.getElementById('stripe-error').textContent = '';

      const returnUrl = CONFIG.SITE_URL + '/checkout';

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: returnUrl },
      });

      if (error) {
        document.getElementById('stripe-error').textContent = error.message;
        Toast.show(error.message, 'error');
        btn.disabled    = false;
        btn.textContent = `Payer $${total.toFixed(2)} →`;
      } else if (paymentIntent?.status === 'succeeded') {
        finalizeOrder('stripe', paymentIntent.id);
      }
    });
  });
}

/* ══════════════════════════════════════════════
   PAYPAL BUTTONS
   ══════════════════════════════════════════════ */
async function renderPayPalForm(container) {
  const cart  = Storage.getCart();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  container.innerHTML = `
    <p style="color:var(--dim);font-size:13px;text-align:center;margin-bottom:16px">
      Cliquez sur le bouton ci-dessous pour payer via PayPal.
    </p>
    <div id="paypal-button-container" style="max-width:380px;margin:0 auto">
      <div class="loading-center" style="padding:20px"><div class="spinner"></div></div>
    </div>`;

  const payBtn = document.getElementById('step2-continue');
  if (payBtn) payBtn.style.display = 'none';

  await loadPayPalSDK();

  if (!window.paypal) {
    document.getElementById('paypal-button-container').innerHTML =
      `<div class="alert alert-error">❌ PayPal SDK non chargé.<br>
       <small>Vérifiez votre <code>PAYPAL_CLIENT_ID</code> dans <code>js/config.js</code></small></div>`;
    return;
  }

  window.paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 },

    createOrder: async () => {
      const res = await fetch(CONFIG.BACKEND_URL + '/create-paypal-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, currency: 'USD', items: cart }),
      });
      if (!res.ok) throw new Error('Erreur serveur PayPal ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.id;
    },

    onApprove: async (data) => {
      try {
        const res = await fetch(CONFIG.BACKEND_URL + '/capture-paypal-order/' + data.orderID, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Erreur capture ' + res.status);
        const capture = await res.json();
        if (capture.status === 'COMPLETED') {
          finalizeOrder('paypal', data.orderID);
        } else {
          throw new Error('Statut inattendu : ' + capture.status);
        }
      } catch (err) {
        Toast.show('Erreur PayPal : ' + err.message, 'error');
      }
    },

    onError:  (err) => { console.error('PayPal:', err); Toast.show('Erreur PayPal. Réessayez.', 'error'); },
    onCancel: ()    => Toast.show('Paiement PayPal annulé.', 'warn'),

  }).render('#paypal-button-container');
}

function loadPayPalSDK() {
  return new Promise(resolve => {
    if (window.paypal) { resolve(); return; }
    if (document.getElementById('paypal-sdk')) {
      const check = setInterval(() => { if (window.paypal) { clearInterval(check); resolve(); } }, 150);
      return;
    }
    const s    = document.createElement('script');
    s.id       = 'paypal-sdk';
    s.src      = `https://www.paypal.com/sdk/js?client-id=${CONFIG.PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
    s.onload   = resolve;
    s.onerror  = () => { console.error('PayPal SDK load failed'); resolve(); };
    document.head.appendChild(s);
  });
}

/* ─── FINALISER ──────────────────────────────── */
function finalizeOrder(method, transactionId) {
  const session = Storage.getSession();
  const cart    = Storage.getCart();
  const total   = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const order = {
    id:            'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    transactionId,
    items:         cart,
    total,
    method,
    date:          new Date().toISOString(),
    status:        'Livré',
  };

  Storage.saveOrder(session.id, order);
  CartUI.clear();
  showSuccess(order);
}

/* ─── RETOUR 3D SECURE ───────────────────────── */
async function handle3DSecureReturn(params) {
  renderHeader('checkout');
  renderFooter();

  if (typeof Stripe === 'undefined') return;
  const stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
  const { paymentIntent } = await stripe.retrievePaymentIntent(
    params.get('payment_intent_client_secret')
  );

  const session = Storage.getSession();
  if (paymentIntent?.status === 'succeeded' && session) {
    finalizeOrder('stripe', paymentIntent.id);
  } else {
    const main = document.getElementById('checkout-main-content');
    if (main) main.innerHTML = `
      <div class="alert alert-error" style="max-width:520px;margin:40px auto">
        ❌ Le paiement 3D Secure a échoué ou a été annulé.
        <a href="/checkout" style="color:var(--accent);margin-left:8px">Réessayer</a>
      </div>`;
  }
}

/* ─── SUCCESS ────────────────────────────────── */
function showSuccess(order) {
  const session = Storage.getSession();
  const main    = document.getElementById('checkout-main-content');
  if (!main) return;
  main.innerHTML = `
    <div class="checkout-success fade-in">
      <div class="checkout-success-icon">✅</div>
      <div class="checkout-success-title">Paiement accepté !</div>
      <div class="checkout-success-sub">
        Votre commande a bien été enregistrée.<br>
        Les identifiants seront envoyés à
        <strong style="color:var(--accent)">${session?.email || ''}</strong>
        dans les prochaines minutes.
      </div>
      <div class="checkout-order-id">${order.id}</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="/account" class="btn btn-gold btn-lg">Voir mes commandes →</a>
        <a href="/shop"    class="btn btn-ghost btn-lg">Continuer les achats</a>
      </div>
    </div>`;
  Toast.show('✅ Commande ' + order.id + ' confirmée !');
}

/* ─── PANIER VIDE ────────────────────────────── */
function showEmptyCart() {
  const main = document.getElementById('checkout-main-content');
  if (!main) return;
  main.innerHTML = `
    <div class="checkout-empty">
      <div class="checkout-empty-icon">🛒</div>
      <h2 style="font-family:Rajdhani,sans-serif;font-size:22px;color:var(--dim);margin-bottom:8px">Panier vide</h2>
      <p style="color:var(--muted);font-size:14px;margin-bottom:20px">Ajoutez des produits avant de commander.</p>
      <a href="/shop" class="btn btn-gold btn-lg">Parcourir la boutique →</a>
    </div>`;
}
