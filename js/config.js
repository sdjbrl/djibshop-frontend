/* ══════════════════════════════════════════════
   js/config.js — Configuration Frontend
   ══════════════════════════════════════════════

   Ce fichier contient les clés PUBLIQUES et l'URL
   du backend. C'est LE SEUL fichier à modifier
   pour connecter le frontend au backend.

   ⚠️  Ne mettez JAMAIS de clés SECRÈTES ici.
       Les clés secrètes vont dans backend/.env
   ══════════════════════════════════════════════ */

const CONFIG = {

  // ── STRIPE ──────────────────────────────────
  // Stripe Dashboard → Développeurs → Clés API → "Clé publiable"
  // Commence par pk_live_ (production) ou pk_test_ (tests)
  STRIPE_PUBLISHABLE_KEY: 'pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',

  // ── PAYPAL ──────────────────────────────────
  // PayPal Developer → My Apps & Credentials → votre app → Client ID
  PAYPAL_CLIENT_ID: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',

  // ── BACKEND ─────────────────────────────────
  // URL Railway de votre backend, format :
  // https://djibshop-backend-production.up.railway.app
  // (sans slash final)
  BACKEND_URL: 'https://VOTRE-APP.up.railway.app',

  // ── SITE ────────────────────────────────────
  // URL Vercel de votre frontend (pour PayPal return_url)
  // https://djibshop.vercel.app
  FRONTEND_URL: 'https://VOTRE-SITE.vercel.app',

};
