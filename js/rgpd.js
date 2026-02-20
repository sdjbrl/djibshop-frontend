/* ══════════════════════════════════════════════
   rgpd.js — Gestion du consentement RGPD
   ══════════════════════════════════════════════ */

const RGPD = {
  STORAGE_KEY: 'djib_consent',

  // Retourne le consentement stocké (ou null si pas encore donné)
  getConsent() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)); } catch { return null; }
  },

  // Enregistre le consentement
  setConsent(prefs) {
    const data = { ...prefs, date: new Date().toISOString(), version: '1.0' };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // A-t-on le consentement pour les cookies fonctionnels (toujours oui)
  hasConsent(type = 'functional') {
    const c = this.getConsent();
    if (!c) return type === 'functional'; // fonctionnel toujours actif
    return c[type] === true;
  },

  // Affiche la bannière si pas encore de réponse
  init() {
    if (this.getConsent()) return; // déjà décidé
    this._show();
  },

  _show() {
    if (document.getElementById('cookie-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
      <div class="cookie-banner-inner">
        <div class="cookie-banner-text">
          <div class="cookie-banner-title">🍪 Cookies & Confidentialité</div>
          <p>Nous utilisons des cookies <strong>strictement nécessaires</strong> au fonctionnement du site
          (panier, session, paiement). Aucun cookie publicitaire ou tracking tiers n'est utilisé.
          <a href="/politique-confidentialite" class="cookie-link">En savoir plus</a></p>
        </div>
        <div class="cookie-banner-actions">
          <button id="cookie-customize" class="btn btn-ghost btn-sm">Personnaliser</button>
          <button id="cookie-accept-all" class="btn btn-gold btn-sm">Accepter</button>
        </div>
      </div>
      <div class="cookie-customize-panel" id="cookie-customize-panel" style="display:none">
        <div class="cookie-option">
          <div class="cookie-option-info">
            <strong>Cookies fonctionnels</strong>
            <span>Panier, session, préférences. Indispensables au site.</span>
          </div>
          <div class="cookie-toggle cookie-toggle-on" title="Toujours actif">✓</div>
        </div>
        <div class="cookie-option">
          <div class="cookie-option-info">
            <strong>Paiement sécurisé</strong>
            <span>Stripe et PayPal nécessitent des cookies pour la sécurité des transactions.</span>
          </div>
          <div class="cookie-toggle cookie-toggle-on" title="Requis pour le paiement">✓</div>
        </div>
        <div class="cookie-option">
          <div class="cookie-option-info">
            <strong>Analytics</strong>
            <span>Statistiques anonymes d'utilisation. Non utilisé actuellement.</span>
          </div>
          <label class="cookie-switch">
            <input type="checkbox" id="consent-analytics">
            <span class="cookie-slider"></span>
          </label>
        </div>
        <button id="cookie-save" class="btn btn-gold btn-sm" style="width:100%;margin-top:8px">Enregistrer mes préférences</button>
      </div>`;
    document.body.appendChild(banner);

    // Bouton accepter tout
    document.getElementById('cookie-accept-all').addEventListener('click', () => {
      this.setConsent({ functional: true, payment: true, analytics: true });
      this._hide();
    });

    // Personnaliser
    document.getElementById('cookie-customize').addEventListener('click', () => {
      const panel = document.getElementById('cookie-customize-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Enregistrer préférences
    document.getElementById('cookie-save').addEventListener('click', () => {
      const analytics = document.getElementById('consent-analytics')?.checked || false;
      this.setConsent({ functional: true, payment: true, analytics });
      this._hide();
    });
  },

  _hide() {
    const b = document.getElementById('cookie-banner');
    if (!b) return;
    b.style.opacity = '0'; b.style.transform = 'translateY(10px)';
    b.style.transition = '.3s';
    setTimeout(() => b.remove(), 300);
  },
};

// Auto-init au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => RGPD.init());
} else {
  RGPD.init();
}
