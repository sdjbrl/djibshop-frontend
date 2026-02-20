/* ══════════════════════════════════════════════
   storage.js — Produits (localStorage)
   Le panier et les produits restent locaux.
   Les utilisateurs et commandes → API (api.js)
   ══════════════════════════════════════════════ */

const Storage = {
  // Produits (gérés en local, sync via admin)
  getProducts() {
    try { return JSON.parse(localStorage.getItem('djib_products')) || []; } catch { return []; }
  },
  setProducts(p) {
    try { localStorage.setItem('djib_products', JSON.stringify(p)); } catch {}
  },

  // Cart — délégué à API
  getCart()      { return API.getCart(); },
  setCart(cart)  { API.setCart(cart); },

  // Compat avec les anciens appels dans components.js / checkout.js
  getSession()   { return API.getSession(); },
};

// ─── Produits par défaut ─────────────────────────────
(function initProducts() {
  if (localStorage.getItem('djib_products')) return;
  const defaults = [
    { id:'p1',  game:'Dokkan Battle',      name:'[Global] Farmed Account 13 000+ DS',     sub:'Android & iOS',      price:18,  oldPrice:null, badge:'instant', category:'farmed',  emoji:'🐉', hot:true,  rating:5.0, reviews:42 },
    { id:'p2',  game:'Dokkan Battle',      name:'[Global] Fresh Starter 9 000 DS',        sub:'Android uniquement', price:12,  oldPrice:null, badge:'instant', category:'starter', emoji:'🐉', hot:false, rating:5.0, reviews:31 },
    { id:'p3',  game:'Dokkan Battle',      name:'[Japan] Farmed 14 000 DS + 4 LR',        sub:'Android uniquement', price:85,  oldPrice:null, badge:null,      category:'farmed',  emoji:'🐉', hot:false, rating:4.9, reviews:18 },
    { id:'p4',  game:'Dokkan Battle',      name:'[Global] Premium 20 000+ DS avec 15 LR', sub:'iOS uniquement',     price:140, oldPrice:null, badge:'premium', category:'premium', emoji:'🐉', hot:true,  rating:4.9, reviews:27 },
    { id:'p5',  game:'Dokkan Battle',      name:'[Global] Farmed 8 000–18 000 DS Anniv.', sub:'Android & iOS',      price:35,  oldPrice:null, badge:null,      category:'farmed',  emoji:'🐉', hot:false, rating:5.0, reviews:15 },
    { id:'p6',  game:'Genshin Impact',     name:'Compte AR45 avec Hu Tao + Ganyu',        sub:'Tous serveurs',      price:35,  oldPrice:null, badge:null,      category:'farmed',  emoji:'⚔️', hot:false, rating:4.8, reviews:15 },
    { id:'p7',  game:'Genshin Impact',     name:'Starter Reroll Account',                 sub:'Tous serveurs',      price:8,   oldPrice:null, badge:'instant', category:'starter', emoji:'⚔️', hot:false, rating:5.0, reviews:50 },
    { id:'p8',  game:'Dragon Ball Legends',name:'Farmed 3 000 CC Account',                sub:'Tous serveurs',      price:25,  oldPrice:null, badge:null,      category:'farmed',  emoji:'🔥', hot:false, rating:4.7, reviews:12 },
    { id:'p9',  game:'Dragon Ball Legends',name:'Starter 1 500 CC Account',               sub:'Tous serveurs',      price:10,  oldPrice:null, badge:'instant', category:'starter', emoji:'🔥', hot:false, rating:5.0, reviews:22 },
    { id:'p10', game:'Honkai Star Rail',   name:'Farmed Account avec Acheron',             sub:'Tous serveurs',      price:30,  oldPrice:null, badge:null,      category:'farmed',  emoji:'🌌', hot:true,  rating:4.9, reviews:19 },
    { id:'p11', game:'Honkai Star Rail',   name:'Starter E1 Black Swan',                  sub:'Tous serveurs',      price:9,   oldPrice:null, badge:'instant', category:'starter', emoji:'🌌', hot:false, rating:5.0, reviews:33 },
    { id:'p12', game:'Zenless Zone Zero',  name:'ZZZ Miyabi Starter Account',             sub:'Tous serveurs',      price:5,   oldPrice:null, badge:'instant', category:'starter', emoji:'⚡', hot:true,  rating:5.0, reviews:44 },
    { id:'p13', game:'Zenless Zone Zero',  name:'ZZZ Farmed avec Ellen Joe',              sub:'Tous serveurs',      price:22,  oldPrice:30,  badge:'off',     category:'farmed',  emoji:'⚡', hot:false, rating:4.8, reviews:11 },
    { id:'p14', game:'One Piece',          name:'OPBR Farmed 5-Star Characters',          sub:'Tous serveurs',      price:20,  oldPrice:null, badge:null,      category:'farmed',  emoji:'⚓', hot:false, rating:4.7, reviews:8  },
    { id:'p15', game:'FGO',               name:'FGO NA Account avec plusieurs SSR',       sub:'Tous serveurs',      price:45,  oldPrice:null, badge:null,      category:'farmed',  emoji:'✨', hot:false, rating:4.9, reviews:16 },
    { id:'p16', game:'FGO',               name:'FGO Starter Reroll Account',              sub:'Tous serveurs',      price:7,   oldPrice:null, badge:'instant', category:'starter', emoji:'✨', hot:false, rating:5.0, reviews:28 },
  ];
  localStorage.setItem('djib_products', JSON.stringify(defaults));
})();
