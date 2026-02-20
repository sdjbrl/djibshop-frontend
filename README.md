# 🎮 Djib's Shop v2 — Railway + Vercel + MongoDB

## Nouvelles fonctionnalités v2
- 🗄️ **MongoDB Atlas** — base de données réelle pour les utilisateurs et commandes
- 📧 **Emails automatiques** — notification commande sur `saidahmed0610@yahoo.com` + confirmation client
- 📩 **Page Contact** — formulaire envoyé sur `pro.saidahmed@yahoo.com`
- 🎨 **Cartes produits épurées** — nouveau design horizontal compact
- 🔐 **Authentification JWT** — tokens sécurisés (plus de localStorage pour les comptes)

---

## Clés à renseigner

### `js/config.js` (frontend — clés PUBLIQUES)
```js
STRIPE_PUBLISHABLE_KEY: 'pk_live_...'
PAYPAL_CLIENT_ID:       'XXXXXX'
BACKEND_URL:            'https://VOTRE-APP.up.railway.app'
SITE_URL:               'https://VOTRE-SITE.vercel.app'
```

### Railway → Variables (clés SECRÈTES)
```
MONGODB_URI            mongodb+srv://user:pass@cluster.mongodb.net/djibshop
JWT_SECRET             chaine_longue_aleatoire
YAHOO_EMAIL            saidahmed0610@yahoo.com
YAHOO_APP_PASS         xxxx xxxx xxxx xxxx   ← App Password Yahoo
NOTIFY_EMAIL           saidahmed0610@yahoo.com
CONTACT_EMAIL          pro.saidahmed@yahoo.com
STRIPE_SECRET_KEY      sk_live_...
STRIPE_WEBHOOK_SECRET  whsec_...
PAYPAL_CLIENT_ID       XXXXXX
PAYPAL_CLIENT_SECRET   XXXXXX
PAYPAL_ENV             production
FRONTEND_URL           https://VOTRE-SITE.vercel.app
NODE_ENV               production
```

---

## Étapes de déploiement

### 1 · MongoDB Atlas (NOUVEAU)

1. **https://mongodb.com/atlas** → **Try Free**
2. New Project → Free cluster (M0 — gratuit pour toujours)
3. Database Access → Add User → username/password → notez-les
4. Network Access → Add IP Address → **0.0.0.0/0** (pour Railway)
5. Clusters → **Connect** → **Drivers** → copiez la URI
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.XXXXX.mongodb.net/djibshop
   ```
   → Collez dans Railway → `MONGODB_URI`

### 2 · App Password Yahoo (NOUVEAU)

> ⚠️ Yahoo ne permet pas d'utiliser votre mot de passe normal via SMTP.

1. **Yahoo Mail** → Icône profil (haut à droite) → **Sécurité du compte**
2. Descendez jusqu'à **Mot de passe d'application** → **Gérer les mots de passe d'application**
3. Choisissez **Autre application** → nom : `Djib Shop` → **Générer**
4. Copiez le mot de passe à 16 caractères → `YAHOO_APP_PASS` sur Railway

### 3 · Backend sur Railway
```bash
cd backend/
git init && git add . && git commit -m "v2"
git remote add origin https://github.com/sdjbrl/djibshop-backend.git
git push -u origin main
```
Railway → New Project → Deploy from GitHub → ajouter les Variables (tableau ci-dessus)

### 4 · Frontend sur Vercel
Mettez à jour `js/config.js` avec l'URL Railway, puis :
```bash
git add . && git commit -m "v2" && git push
```
Vercel redéploie automatiquement.

### 5 · Vérification
```
https://sdjbrl.up.railway.app/health
```
```json
{ "status": "ok", "mongo": true, "stripe": true, "paypal": true, "smtp": true }
```

---

## Compte Admin
| Email | `admin@djibshop.com` |
| Mot de passe | valeur de `ADMIN_PASSWORD` dans Railway (défaut: `Admin@2025`) |

---

## Réseaux sociaux
- Twitter/X : [@flrdlsx](https://x.com/flrdlsx) · Discord : `sdjbrl`
