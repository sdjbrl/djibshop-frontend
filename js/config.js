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
  // Commence par pklive (production) ou pktest (tests)
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51NdWd0DacT37gJoCqwP9Wzu347Z7KLkC8s7x5OaG2p2P2Q9NjWxuqkcw5nT9YtkIlnvTTYx9OhFeKJBZKlbBvwcV00dxICTm4u',

  // ── PAYPAL ──────────────────────────────────
  // PayPal Developer → My Apps & Credentials → votre app → Client ID
  PAYPAL_CLIENTID: 'BAAgK95qSIqKKFaI-pa31yVyAZgCFd2epJ_OUYvHvOXXQvpHq18RpKFFODvqBxBXJ1HD2FPW6CsHjy2QE',

  // ── BACKEND ─────────────────────────────────
  // URL Railway de votre backend, format :
  // https://djibshop-backend-production.up.railway.app/
  // (sans slash final)
BACKEND_URL: 'https://djibshop-backend-production.up.railway.app',

  // ── SITE ────────────────────────────────────
  // Détecté automatiquement depuis l'URL du navigateur
  // Fonctionne sur djibshop.vercel.app ET en local
  SITE_URL: (typeof window !== 'undefined')
    ? window.location.origin
    : 'https://djibshop.vercel.app',

};
