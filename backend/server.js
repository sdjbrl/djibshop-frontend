// ══════════════════════════════════════════════════════
//  backend/server.js — Djib's Shop Payment Backend
//  Déployé sur Railway
// ══════════════════════════════════════════════════════

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch   = require('node-fetch');

const app  = express();
const PORT = process.env.PORT || 4242;

// ─── CORS ─────────────────────────────────────────────
// FRONTEND_URL = https://djibshop.vercel.app
// Les preview Vercel ont le format : https://djibshop-git-main-pseudo.vercel.app
//
// On extrait le "slug" du projet : "djibshop" depuis "https://djibshop.vercel.app"
// et on autorise tout domaine commençant par ce slug sur vercel.app.
const FRONTEND_URL    = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const VERCEL_SLUG     = FRONTEND_URL.replace('https://', '').split('.')[0]; // ex: "djibshop"

const isAllowedOrigin = (origin) => {
  if (!origin) return true;                                     // curl / Postman
  if (origin === FRONTEND_URL) return true;                     // prod exacte
  if (VERCEL_SLUG && origin.startsWith(`https://${VERCEL_SLUG}-`) && origin.endsWith('.vercel.app')) return true; // previews
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true; // dev local
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn('[CORS] Bloqué:', origin);
    callback(new Error('CORS: origin non autorisée'));
  },
  credentials: true,
}));

// ─── Raw body pour Stripe webhooks (AVANT express.json) ─
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// ══════════════════════════════════════════════
//  STRIPE
// ══════════════════════════════════════════════

/**
 * POST /create-payment-intent
 * Crée un PaymentIntent et renvoie le clientSecret au frontend
 */
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', orderItems, customerEmail } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100), // centimes
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      metadata: {
        shop:  "Djib's Shop",
        items: JSON.stringify((orderItems || []).map(i => i.name).slice(0, 5)),
      },
    });

    console.log(`[Stripe] PaymentIntent créé: ${paymentIntent.id} — $${amount}`);
    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error('[Stripe] create-payment-intent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /webhook/stripe
 * Webhook Stripe — configurez dans Stripe Dashboard → Développeurs → Webhooks
 * URL à renseigner : https://VOTRE-APP.up.railway.app/webhook/stripe
 * Événements : payment_intent.succeeded, payment_intent.payment_failed
 */
app.post('/webhook/stripe', (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET non configuré — webhook non vérifié');
    return res.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature invalide:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      console.log(`[Stripe Webhook] ✅ Paiement réussi: ${pi.id} — ${pi.amount / 100} ${pi.currency}`);
      // TODO: Envoyer les identifiants par email ici
      // Exemple avec nodemailer :
      // await sendDeliveryEmail({
      //   to:    pi.receipt_email,
      //   items: JSON.parse(pi.metadata.items || '[]'),
      //   orderId: pi.id,
      // });
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      console.warn(`[Stripe Webhook] ❌ Paiement échoué: ${pi.id}`);
      break;
    }
    default:
      console.log(`[Stripe Webhook] Événement ignoré: ${event.type}`);
  }

  res.json({ received: true });
});

// ══════════════════════════════════════════════
//  PAYPAL
// ══════════════════════════════════════════════

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Cache du token PayPal pour éviter de le redemander à chaque requête
let paypalTokenCache = { token: null, expiresAt: 0 };

async function getPayPalToken() {
  const now = Date.now();
  if (paypalTokenCache.token && paypalTokenCache.expiresAt > now + 60000) {
    return paypalTokenCache.token;
  }

  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials manquants dans .env');
  }

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('PayPal token failed: ' + JSON.stringify(data));
  }

  paypalTokenCache = {
    token:     data.access_token,
    expiresAt: now + (data.expires_in * 1000),
  };

  return data.access_token;
}

/**
 * POST /create-paypal-order
 * Crée une commande PayPal et retourne l'orderID
 */
app.post('/create-paypal-order', async (req, res) => {
  try {
    const { amount, currency = 'USD', items } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const token    = await getPayPalToken();
    const frontUrl = process.env.FRONTEND_URL || 'https://djibshop.vercel.app';

    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'PayPal-Request-Id': `djibshop-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `djibshop-${Date.now()}`,
          description:  "Djib's Shop — Compte gaming",
          amount: {
            currency_code: currency.toUpperCase(),
            value:         parseFloat(amount).toFixed(2),
          },
        }],
        application_context: {
          brand_name:          "Djib's Shop",
          landing_page:        'LOGIN',
          user_action:         'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: `${frontUrl}/checkout.html?status=success`,
          cancel_url: `${frontUrl}/checkout.html?status=cancel`,
        },
      }),
    });

    const data = await response.json();
    if (data.id) {
      console.log(`[PayPal] Commande créée: ${data.id} — $${amount}`);
      res.json({ id: data.id });
    } else {
      throw new Error(JSON.stringify(data));
    }

  } catch (err) {
    console.error('[PayPal] create-paypal-order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /capture-paypal-order/:orderID
 * Capture le paiement après approbation du client
 */
app.post('/capture-paypal-order/:orderID', async (req, res) => {
  try {
    const { orderID } = req.params;
    const token = await getPayPalToken();

    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.status === 'COMPLETED') {
      const payer = data.payer;
      console.log(`[PayPal] ✅ Paiement capturé: ${orderID} — ${payer?.email_address}`);
      // TODO: Envoyer les identifiants par email ici
      res.json({
        status:     'COMPLETED',
        orderID,
        payerEmail: payer?.email_address,
      });
    } else {
      throw new Error('Statut inattendu: ' + data.status + ' — ' + JSON.stringify(data));
    }

  } catch (err) {
    console.error('[PayPal] capture error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check (Railway l'utilise pour vérifier l'état) ───
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    time:    new Date().toISOString(),
    stripe:  !!process.env.STRIPE_SECRET_KEY,
    paypal:  !!process.env.PAYPAL_CLIENT_ID,
    env:     process.env.NODE_ENV || 'development',
  });
});

// ─── Démarrage ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 Djib\'s Shop Backend — Railway');
  console.log(`   Port    : ${PORT}`);
  console.log(`   Stripe  : ${process.env.STRIPE_SECRET_KEY  ? '✅ OK' : '❌ STRIPE_SECRET_KEY manquant'}`);
  console.log(`   PayPal  : ${process.env.PAYPAL_CLIENT_ID   ? '✅ OK' : '❌ PAYPAL_CLIENT_ID manquant'}`);
  console.log(`   Frontend: ${process.env.FRONTEND_URL       || '⚠️  FRONTEND_URL non défini'}`);
  console.log(`   PayPal env: ${process.env.PAYPAL_ENV       || 'sandbox (défaut)'}`);
  console.log('');
});
