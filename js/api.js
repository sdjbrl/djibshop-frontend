/* ══════════════════════════════════════════════
   js/api.js — Client API (appels vers Railway)
   ══════════════════════════════════════════════ */

const API = {
  // ─── Token JWT ─────────────────────────────────
  getToken()        { return localStorage.getItem('djib_token'); },
  setToken(t)       { localStorage.setItem('djib_token', t); },
  clearToken()      { localStorage.removeItem('djib_token'); },

  // ─── Session locale (pour affichage rapide) ─────
  getSession()      { try { return JSON.parse(localStorage.getItem('djib_session')); } catch { return null; } },
  setSession(user)  { localStorage.setItem('djib_session', JSON.stringify(user)); },
  clearSession()    { localStorage.removeItem('djib_session'); localStorage.removeItem('djib_token'); },

  // ─── Headers avec auth ──────────────────────────
  _headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const t = this.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  },

  // ─── Requête générique ──────────────────────────
  async _req(method, path, body) {
    const res = await fetch(CONFIG.BACKEND_URL + path, {
      method,
      headers: this._headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  },

  // ── AUTH ─────────────────────────────────────────
  async register(name, email, password) {
    const data = await this._req('POST', '/api/auth/register', { name, email, password });
    this.setToken(data.token);
    this.setSession(data.user);
    return data.user;
  },

  async login(email, password) {
    const data = await this._req('POST', '/api/auth/login', { email, password });
    this.setToken(data.token);
    this.setSession(data.user);
    return data.user;
  },

  async me() {
    const data = await this._req('GET', '/api/auth/me');
    this.setSession(data.user);
    return data.user;
  },

  // ── ORDERS ───────────────────────────────────────
  async saveOrder(order) {
    const data = await this._req('POST', '/api/orders', order);
    return data.order;
  },

  async getMyOrders() {
    const data = await this._req('GET', '/api/orders');
    return data.orders;
  },

  async getAllOrders() {
    const data = await this._req('GET', '/api/orders/all');
    return data.orders;
  },

  async getAllUsers() {
    const data = await this._req('GET', '/api/users');
    return data.users;
  },

  // ── CONTACT ──────────────────────────────────────
  async sendContact(form) {
    return this._req('POST', '/api/contact', form);
  },

  // ── CART (localStorage) ──────────────────────────
  getCart()        { try { return JSON.parse(localStorage.getItem('djib_cart')) || []; } catch { return []; } },
  setCart(cart)    { localStorage.setItem('djib_cart', JSON.stringify(cart)); },
  clearCart()      { localStorage.removeItem('djib_cart'); },
};

// Patch: add forgotPassword and resetPassword
API.forgotPassword = function(email) {
  return this._req('POST', '/api/auth/forgot-password', { email });
};
API.resetPassword = function(token, password) {
  return this._req('POST', '/api/auth/reset-password', { token, password });
};
