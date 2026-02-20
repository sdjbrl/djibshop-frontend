/* ══════════════════════════════════════════════
   storage.js — Persistent data layer
   ══════════════════════════════════════════════ */

const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem('djib_' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('djib_' + key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem('djib_' + key); } catch {}
  },
  // Users
  getUsers()             { return this.get('users', {}); },
  setUsers(users)        { return this.set('users', users); },
  getUserByEmail(email)  { const u = this.getUsers(); return u[email] || null; },
  saveUser(user)         { const u = this.getUsers(); u[user.email] = user; this.setUsers(u); },

  // Session
  getSession()           { return this.get('session', null); },
  setSession(user)       { this.set('session', user); },
  clearSession()         { this.remove('session'); },

  // Orders
  getOrders(userId)      { return this.get('orders_' + userId, []); },
  saveOrder(userId, order) {
    const orders = this.getOrders(userId);
    orders.unshift(order);
    this.set('orders_' + userId, orders);
  },
  getAllOrders() {
    const users = this.getUsers();
    let all = [];
    Object.values(users).forEach(u => {
      const orders = this.getOrders(u.id);
      orders.forEach(o => all.push({ ...o, userName: u.name, userEmail: u.email }));
    });
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // Products (admin can add/edit/delete)
  getProducts() {
    const saved = this.get('products', null);
    return saved || [];
  },
  setProducts(products) { this.set('products', products); },

  // Cart (persisted)
  getCart()              { return this.get('cart', []); },
  setCart(cart)          { this.set('cart', cart); },
};

// ─── Initialize default products if empty ───
(function initProducts() {
  if (Storage.get('products') !== null) return;
  const defaults = [
    { id:'p1',  game:'Dokkan Battle', name:'[Global] Farmed Account 13 000+ DS', sub:'Android & iOS',   price:18,  oldPrice:null, badge:'instant', category:'farmed',  emoji:'🐉', hot:true,  rating:5.0, reviews:42 },
    { id:'p2',  game:'Dokkan Battle', name:'[Global] Fresh Starter 9 000 DS',    sub:'Android uniquement',price:12, oldPrice:null, badge:'instant', category:'starter', emoji:'🐉', hot:false, rating:5.0, reviews:31 },
    { id:'p3',  game:'Dokkan Battle', name:'[Japan] Farmed 14 000 DS + 4 LR',    sub:'Android uniquement',price:85, oldPrice:null, badge:null,      category:'farmed',  emoji:'🐉', hot:false, rating:4.9, reviews:18 },
    { id:'p4',  game:'Dokkan Battle', name:'[Global] Premium 20 000+ DS avec 15 LR', sub:'iOS uniquement', price:140,oldPrice:null, badge:'premium', category:'premium', emoji:'🐉', hot:true,  rating:4.9, reviews:27 },
    { id:'p5',  game:'Dokkan Battle', name:'[Global] Farmed 8 000–18 000 DS Anniv.', sub:'Android & iOS', price:35, oldPrice:null, badge:null,      category:'farmed',  emoji:'🐉', hot:false, rating:5.0, reviews:15 },
    { id:'p6',  game:'Genshin Impact',name:'Compte AR45 avec Hu Tao + Ganyu',    sub:'Tous serveurs',   price:35,  oldPrice:null, badge:null,      category:'farmed',  emoji:'⚔️', hot:false, rating:4.8, reviews:15 },
    { id:'p7',  game:'Genshin Impact',name:'Starter Reroll Account',              sub:'Tous serveurs',   price:8,   oldPrice:null, badge:'instant', category:'starter', emoji:'⚔️', hot:false, rating:5.0, reviews:50 },
    { id:'p8',  game:'Dragon Ball Legends',name:'Farmed 3 000 CC Account',        sub:'Tous serveurs',   price:25,  oldPrice:null, badge:null,      category:'farmed',  emoji:'🔥', hot:false, rating:4.7, reviews:12 },
    { id:'p9',  game:'Dragon Ball Legends',name:'Starter 1 500 CC Account',       sub:'Tous serveurs',   price:10,  oldPrice:null, badge:'instant', category:'starter', emoji:'🔥', hot:false, rating:5.0, reviews:22 },
    { id:'p10', game:'Honkai Star Rail',name:'Farmed Account avec Acheron',        sub:'Tous serveurs',   price:30,  oldPrice:null, badge:null,      category:'farmed',  emoji:'🌌', hot:true,  rating:4.9, reviews:19 },
    { id:'p11', game:'Honkai Star Rail',name:'Starter E1 Black Swan',              sub:'Tous serveurs',   price:9,   oldPrice:null, badge:'instant', category:'starter', emoji:'🌌', hot:false, rating:5.0, reviews:33 },
    { id:'p12', game:'Zenless Zone Zero',name:'ZZZ Miyabi Starter Account',        sub:'Tous serveurs',   price:5,   oldPrice:null, badge:'instant', category:'starter', emoji:'⚡', hot:true,  rating:5.0, reviews:44 },
    { id:'p13', game:'Zenless Zone Zero',name:'ZZZ Farmed avec Ellen Joe',          sub:'Tous serveurs',   price:22,  oldPrice:30,  badge:'off',     category:'farmed',  emoji:'⚡', hot:false, rating:4.8, reviews:11 },
    { id:'p14', game:'One Piece',       name:'OPBR Farmed 5-Star Characters',       sub:'Tous serveurs',   price:20,  oldPrice:null, badge:null,      category:'farmed',  emoji:'⚓', hot:false, rating:4.7, reviews:8  },
    { id:'p15', game:'FGO',            name:'FGO NA Account avec plusieurs SSR',    sub:'Tous serveurs',   price:45,  oldPrice:null, badge:null,      category:'farmed',  emoji:'✨', hot:false, rating:4.9, reviews:16 },
    { id:'p16', game:'FGO',            name:'FGO Starter Reroll Account',           sub:'Tous serveurs',   price:7,   oldPrice:null, badge:'instant', category:'starter', emoji:'✨', hot:false, rating:5.0, reviews:28 },
  ];
  Storage.setProducts(defaults);
})();

// ─── Initialize admin account if not exists ───
(function initAdmin() {
  const users = Storage.getUsers();
  if (!users['admin@djibshop.com']) {
    const admin = {
      id: 'admin',
      name: 'Admin',
      email: 'admin@djibshop.com',
      password: 'Admin@2025',
      isAdmin: true,
      createdAt: new Date().toISOString(),
    };
    users['admin@djibshop.com'] = admin;
    Storage.setUsers(users);
  }
})();
