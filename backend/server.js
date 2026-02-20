// ══════════════════════════════════════════════════════
//  backend/server.js — Djib's Shop — Railway
//  MongoDB + Emails (Resend API) + Stripe + PayPal
// ══════════════════════════════════════════════════════
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const { Resend } = require('resend');
const stripe     = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch      = require('node-fetch');

const app  = express();
const PORT = process.env.PORT || 4242;

// ══════════════════════════════════════════════
//  MONGODB CONNECTION
// ══════════════════════════════════════════════
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ MongoDB erreur:', err.message));

// ── Schemas ──────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  isAdmin:   { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:       { type: String, required: true, unique: true },
  transactionId: { type: String },
  items:         { type: Array, required: true },
  total:         { type: Number, required: true },
  method:        { type: String, enum: ['stripe', 'paypal'], required: true },
  status:        { type: String, default: 'Livré' },
  createdAt:     { type: Date, default: Date.now },
});

const User  = mongoose.model('User',  userSchema);
const Order = mongoose.model('Order', orderSchema);
// ── Password Reset Token ─────────────────────────────
const resetSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});
const PasswordReset = mongoose.model('PasswordReset', resetSchema);



// ─── Seed admin si absent ────────────────────────────
(async () => {
  const existing = await User.findOne({ email: 'admin@djibshop.com' }).catch(() => null);
  if (!existing) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@2025', 10);
    await User.create({ name: 'Admin', email: 'admin@djibshop.com', password: hashed, isAdmin: true });
    console.log('👤 Compte admin créé');
  }
})();

// ══════════════════════════════════════════════
//  CORS
// ══════════════════════════════════════════════
const FRONTEND_URL  = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const VERCEL_SLUG   = FRONTEND_URL.replace('https://', '').split('.')[0];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin === FRONTEND_URL) return true;
  if (VERCEL_SLUG && origin.startsWith(`https://${VERCEL_SLUG}-`) && origin.endsWith('.vercel.app')) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

app.use(cors({ origin: (o, cb) => isAllowedOrigin(o) ? cb(null, true) : cb(new Error('CORS bloqué')), credentials: true }));
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// ══════════════════════════════════════════════
//  EMAIL (Resend API — fonctionne sur Railway)
// ══════════════════════════════════════════════
// RESEND_API_KEY=re_XXXXXXXXXX (resend.com → API Keys)
// FROM_EMAIL=noreply@VOTRE-DOMAINE.com  (domaine vérifié dans Resend)
// Si pas de domaine vérifié → utiliser onboarding@resend.dev en test
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

async function sendEmail({ to, subject, html, replyTo }) {
  const { error } = await resend.emails.send({
    from:     `Djib's Shop <${FROM_EMAIL}>`,
    to:       Array.isArray(to) ? to : [to],
    subject,
    html,
    reply_to: replyTo,
  });
  if (error) throw new Error('Resend error: ' + JSON.stringify(error));
}

async function sendOrderNotification({ order, user, items }) {
  const itemsList = items.map(i => `  • ${i.name} — $${i.price.toFixed(2)}`).join('\n');
  const html = `
<div style="font-family:Inter,sans-serif;max-width:580px;margin:0 auto;background:#07080f;color:#e8eaf0;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#f0a500,#c88500);padding:24px 28px">
    <h1 style="margin:0;color:#000;font-size:22px;font-weight:800">🎮 Djib's Shop — Nouvelle commande</h1>
  </div>
  <div style="padding:28px">
    <p style="color:#9ca3af;font-size:14px;margin:0 0 18px">Commande reçue le <strong style="color:#e8eaf0">${new Date().toLocaleString('fr-FR')}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">ID commande</td><td style="color:#f0a500;font-weight:700">${order.orderId}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Client</td><td style="color:#e8eaf0">${user.name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Email client</td><td style="color:#e8eaf0">${user.email}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Paiement</td><td style="color:#e8eaf0">${order.method === 'stripe' ? '💳 Stripe' : '🔵 PayPal'}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Total</td><td style="color:#f0a500;font-weight:800;font-size:18px">$${order.total.toFixed(2)}</td></tr>
    </table>
    <div style="background:#12141e;border:1px solid #1e2235;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Articles achetés</div>
      ${items.map(i => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e2235;font-size:13px">
        <span style="color:#e8eaf0">${i.emoji} ${i.name}</span>
        <span style="color:#f0a500;font-weight:700">$${i.price.toFixed(2)}</span>
      </div>`).join('')}
    </div>
    <div style="background:#0f1e14;border:1px solid rgba(34,197,94,.2);border-radius:8px;padding:12px;font-size:13px;color:#22c55e">
      ⚠️ Pensez à envoyer les identifiants du compte à <strong>${user.email}</strong>
    </div>
  </div>
</div>`;

  await sendEmail({
    to:      process.env.NOTIFY_EMAIL || 'saidahmed0610@yahoo.com',
    subject: `[Commande] ${order.orderId} — $${order.total.toFixed(2)} — ${user.name}`,
    html,
  });
}

async function sendOrderConfirmationToClient({ order, user, items }) {
  const itemsList = items.map(i => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e2235;font-size:13px"><span style="color:#e8eaf0">${i.emoji} ${i.name}</span><span style="color:#f0a500;font-weight:700">$${i.price.toFixed(2)}</span></div>`).join('');
  const html = `
<div style="font-family:Inter,sans-serif;max-width:580px;margin:0 auto;background:#07080f;color:#e8eaf0;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#f0a500,#c88500);padding:24px 28px">
    <h1 style="margin:0;color:#000;font-size:22px;font-weight:800">✅ Commande confirmée !</h1>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 8px">Bonjour <strong>${user.name}</strong>,</p>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 20px">Votre commande <strong style="color:#f0a500">${order.orderId}</strong> a bien été enregistrée. Vous recevrez les identifiants du compte dans les prochaines minutes.</p>
    <div style="background:#12141e;border:1px solid #1e2235;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Votre commande</div>
      ${itemsList}
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-weight:700;font-size:16px">
        <span style="color:#e8eaf0">Total</span>
        <span style="color:#f0a500">$${order.total.toFixed(2)}</span>
      </div>
    </div>
    <p style="color:#6b7280;font-size:12px">Besoin d'aide ? Contactez-nous sur <a href="https://x.com/flrdlsx" style="color:#f0a500">Twitter @flrdlsx</a> ou Discord <strong>sdjbrl</strong>.</p>
  </div>
</div>`;

  await sendEmail({
    to:      user.email,
    subject: `✅ Commande ${order.orderId} confirmée — Djib's Shop`,
    html,
  });
}

// ══════════════════════════════════════════════
//  JWT MIDDLEWARE
// ══════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || 'djibshop_secret_change_me';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Accès refusé' });
    next();
  });
}

// ══════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs manquants' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6)' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email déjà utilisé' });
    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name: name.trim(), email: email.toLowerCase(), password: hashed });
    const token  = jwt.sign({ id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, createdAt: user.createdAt } });
  } catch (err) {
    console.error('[register]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, createdAt: user.createdAt } });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });
    const user = await User.findOne({ email: email.toLowerCase() });

    // Toujours répondre OK (sécurité — ne pas révéler si l'email existe)
    res.json({ success: true });
    if (!user) return;

    // Supprimer les anciens tokens
    await PasswordReset.deleteMany({ userId: user._id });

    // Créer un token sécurisé (1h de validité)
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({
      userId:    user._id,
      token,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    const frontUrl  = process.env.FRONTEND_URL || '';
    const resetLink = `${frontUrl}/reset-password?token=${token}`;

    const html = `
<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#07080f;color:#e8eaf0;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#f0a500,#c88500);padding:22px 28px">
    <h1 style="margin:0;color:#000;font-size:20px;font-weight:800">🔑 Réinitialisation de mot de passe</h1>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 8px">Bonjour <strong>${user.name}</strong>,</p>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">
      Vous avez demandé à réinitialiser votre mot de passe sur Djib's Shop.<br>
      Ce lien est valable <strong style="color:#e8eaf0">1 heure</strong>.
    </p>
    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#f0a500,#c88500);color:#000;font-weight:800;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
      Réinitialiser mon mot de passe →
    </a>
    <p style="color:#6b7280;font-size:12px;margin-top:20px">
      Si vous n'avez pas fait cette demande, ignorez cet email.<br>
      Lien : <a href="${resetLink}" style="color:#f0a500;word-break:break-all">${resetLink}</a>
    </p>
  </div>
</div>`;

    await sendEmail({
      to:      user.email,
      subject: `🔑 Réinitialisation de mot de passe — Djib's Shop`,
      html,
    });
    console.log(`[forgot-password] Email envoyé à ${user.email}`);
  } catch (err) {
    console.error('[forgot-password]', err.message);
    // Ne pas exposer l'erreur (déjà répondu OK)
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6)' });

    const reset = await PasswordReset.findOne({ token });
    if (!reset || reset.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Lien invalide ou expiré. Demandez un nouveau lien.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(reset.userId, { password: hashed });
    await PasswordReset.deleteMany({ userId: reset.userId });

    console.log(`[reset-password] Mot de passe changé pour userId ${reset.userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[reset-password]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
//  ORDERS ROUTES
// ══════════════════════════════════════════════

// POST /api/orders — sauvegarder après paiement réel
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { orderId, transactionId, items, total, method } = req.body;
    const order = await Order.create({ userId: req.user.id, orderId, transactionId, items, total, method });
    // Récup user pour les emails
    const user = await User.findById(req.user.id).select('-password');
    // Envoi des emails (non bloquant)
    Promise.all([
      sendOrderNotification({ order, user, items }).catch(e => console.warn('[email notif]', e.message)),
      sendOrderConfirmationToClient({ order, user, items }).catch(e => console.warn('[email confirm]', e.message)),
    ]);
    res.status(201).json({ order });
  } catch (err) {
    console.error('[orders POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — commandes de l'utilisateur connecté
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/all — toutes les commandes (admin)
app.get('/api/orders/all', adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().populate('userId', 'name email').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
//  USERS ROUTES (admin)
// ══════════════════════════════════════════════

// GET /api/users — tous les utilisateurs (admin)
app.get('/api/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
//  CONTACT ROUTE
// ══════════════════════════════════════════════

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Champs requis manquants' });

    const html = `
<div style="font-family:Inter,sans-serif;max-width:580px;margin:0 auto;background:#07080f;color:#e8eaf0;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#4f8ef7,#2563eb);padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800">📩 Nouveau message — Djib's Shop</h1>
  </div>
  <div style="padding:28px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:100px">Nom</td><td style="color:#e8eaf0;font-weight:600">${name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Email</td><td><a href="mailto:${email}" style="color:#4f8ef7">${email}</a></td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Sujet</td><td style="color:#e8eaf0">${subject || 'Non précisé'}</td></tr>
    </table>
    <div style="background:#12141e;border:1px solid #1e2235;border-radius:8px;padding:16px">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Message</div>
      <p style="color:#e8eaf0;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap">${message.replace(/</g,'&lt;')}</p>
    </div>
    <p style="margin-top:16px;color:#6b7280;font-size:12px">Répondre à : <a href="mailto:${email}" style="color:#4f8ef7">${email}</a></p>
  </div>
</div>`;

    await sendEmail({
      to:      process.env.CONTACT_EMAIL || 'pro.saidahmed@yahoo.com',
      subject: `[Contact] ${subject || 'Message'} — ${name}`,
      html,
      replyTo: email,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[contact]', err.message);
    res.status(500).json({ error: 'Erreur envoi email. Réessayez.' });
  }
});

// ══════════════════════════════════════════════
//  STRIPE
// ══════════════════════════════════════════════
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', orderItems, customerEmail } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      metadata: { shop: "Djib's Shop", items: JSON.stringify((orderItems || []).map(i => i.name).slice(0, 5)) },
    });
    console.log(`[Stripe] PI créé: ${paymentIntent.id} — $${amount}`);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('[Stripe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/webhook/stripe', (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.json({ received: true });
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, sig, secret); }
  catch (err) { return res.status(400).send('Webhook Error: ' + err.message); }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    console.log(`[Stripe Webhook] ✅ ${pi.id} — ${pi.amount / 100} ${pi.currency}`);
  }
  res.json({ received: true });
});

// ══════════════════════════════════════════════
//  PAYPAL
// ══════════════════════════════════════════════
const PAYPAL_BASE = process.env.PAYPAL_ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
let paypalTokenCache = { token: null, expiresAt: 0 };

async function getPayPalToken() {
  const now = Date.now();
  if (paypalTokenCache.token && paypalTokenCache.expiresAt > now + 60000) return paypalTokenCache.token;
  const clientId = process.env.PAYPAL_CLIENT_ID, clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PayPal credentials manquants');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('PayPal token failed: ' + JSON.stringify(data));
  paypalTokenCache = { token: data.access_token, expiresAt: now + (data.expires_in * 1000) };
  return data.access_token;
}

app.post('/create-paypal-order', async (req, res) => {
  try {
    const { amount, currency = 'USD', items } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
    const token    = await getPayPalToken();
    const frontUrl = process.env.FRONTEND_URL || '';
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'PayPal-Request-Id': `djibshop-${Date.now()}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ description: "Djib's Shop — Compte gaming", amount: { currency_code: currency.toUpperCase(), value: parseFloat(amount).toFixed(2) } }],
        application_context: { brand_name: "Djib's Shop", landing_page: 'LOGIN', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING', return_url: `${frontUrl}/checkout?status=success`, cancel_url: `${frontUrl}/checkout?status=cancel` },
      }),
    });
    const data = await response.json();
    if (data.id) { console.log(`[PayPal] Commande: ${data.id}`); res.json({ id: data.id }); }
    else throw new Error(JSON.stringify(data));
  } catch (err) { console.error('[PayPal create]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/capture-paypal-order/:orderID', async (req, res) => {
  try {
    const token    = await getPayPalToken();
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${req.params.orderID}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.status === 'COMPLETED') {
      console.log(`[PayPal] ✅ Capturé: ${req.params.orderID}`);
      res.json({ status: 'COMPLETED', orderID: req.params.orderID, payerEmail: data.payer?.email_address });
    } else throw new Error('Statut: ' + data.status);
  } catch (err) { console.error('[PayPal capture]', err.message); res.status(500).json({ error: err.message }); }
});

// ─── Health ───────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok', time: new Date().toISOString(),
  mongo:  mongoose.connection.readyState === 1,
  stripe: !!process.env.STRIPE_SECRET_KEY,
  paypal: !!process.env.PAYPAL_CLIENT_ID,
  email:  !!process.env.RESEND_API_KEY,
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Djib's Shop Backend — port ${PORT}`);
  console.log(`   MongoDB : ${process.env.MONGODB_URI ? '✅' : '❌ MONGODB_URI manquant'}`);
  console.log(`   Stripe  : ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}`);
  console.log(`   PayPal  : ${process.env.PAYPAL_CLIENT_ID ? '✅' : '❌'}`);
  console.log(`   Email   : ${process.env.RESEND_API_KEY ? '✅ Resend' : '❌ RESEND_API_KEY manquant'}`);
  console.log(`   Frontend: ${process.env.FRONTEND_URL || '⚠️  non défini'}\n`);
});
