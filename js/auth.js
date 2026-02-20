/* ══════════════════════════════════════════════
   auth.js — Login & Register (via API MongoDB)
   ══════════════════════════════════════════════ */

/* ─── LOGIN ──────────────────────────────────── */
function initLogin() {
  if (API.getSession()) { window.location.href = '/account'; return; }
  renderHeader('login'); renderFooter(); Toast.init();

  const form  = document.getElementById('login-form');
  const emailI= document.getElementById('login-email');
  const passI = document.getElementById('login-pass');
  const errEl = document.getElementById('login-error');
  const btnEl = document.getElementById('login-btn');

  document.getElementById('login-eye')?.addEventListener('click', () => {
    passI.type = passI.type === 'password' ? 'text' : 'password';
    document.getElementById('login-eye').textContent = passI.type === 'password' ? '👁' : '🙈';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const email = emailI.value.trim().toLowerCase();
    const pass  = passI.value;
    if (!email || !pass) { errEl.textContent = 'Veuillez remplir tous les champs.'; return; }

    btnEl.disabled = true; btnEl.textContent = 'Connexion…';
    try {
      const user = await API.login(email, pass);
      Toast.show('Bienvenue, ' + user.name + ' ! 👋');
      setTimeout(() => window.location.href = user.isAdmin ? '/admin' : '/account', 600);
    } catch (err) {
      errEl.textContent = err.message || 'Email ou mot de passe incorrect.';
      btnEl.disabled = false; btnEl.textContent = 'Se connecter';
    }
  });
}

/* ─── REGISTER ───────────────────────────────── */
function initRegister() {
  if (API.getSession()) { window.location.href = '/account'; return; }
  renderHeader('register'); renderFooter(); Toast.init();

  const form   = document.getElementById('reg-form');
  const nameI  = document.getElementById('reg-name');
  const emailI = document.getElementById('reg-email');
  const passI  = document.getElementById('reg-pass');
  const pass2I = document.getElementById('reg-pass2');
  const btnEl  = document.getElementById('reg-btn');
  const errEl  = document.getElementById('reg-error');

  const toggleEye = (btnId, input) => document.getElementById(btnId)?.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    document.getElementById(btnId).textContent = input.type === 'password' ? '👁' : '🙈';
  });
  toggleEye('reg-eye',  passI);
  toggleEye('reg-eye2', pass2I);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const name  = nameI.value.trim();
    const email = emailI.value.trim().toLowerCase();
    const pass  = passI.value;
    const pass2 = pass2I.value;

    if (!name)               { errEl.textContent = 'Nom requis.'; return; }
    if (!email.includes('@')){ errEl.textContent = 'Email invalide.'; return; }
    if (pass.length < 6)     { errEl.textContent = 'Mot de passe : min 6 caractères.'; return; }
    if (pass !== pass2)      { errEl.textContent = 'Les mots de passe ne correspondent pas.'; return; }

    btnEl.disabled = true; btnEl.textContent = 'Création…';
    try {
      const user = await API.register(name, email, pass);
      const box = document.querySelector('.auth-box');
      if (box) box.innerHTML = `
        <div class="auth-success">
          <div class="auth-success-icon">🎉</div>
          <div class="auth-success-title">Compte créé !</div>
          <div class="auth-success-sub">Bienvenue, ${user.name} ! Redirection…</div>
        </div>`;
      setTimeout(() => window.location.href = '/account', 1200);
    } catch (err) {
      errEl.textContent = err.message || 'Erreur lors de la création du compte.';
      btnEl.disabled = false; btnEl.textContent = 'Créer mon compte';
    }
  });
}

/* ─── LOGOUT ─────────────────────────────────── */
function logout() {
  API.clearSession();
  window.location.href = '/';
}

/* ─── AUTH GUARD ─────────────────────────────── */
function requireAuth(redirectTo = '/login') {
  if (!API.getSession()) { window.location.href = redirectTo; return false; }
  return true;
}
function requireAdmin(redirectTo = '/') {
  const s = API.getSession();
  if (!s || !s.isAdmin) { window.location.href = redirectTo; return false; }
  return true;
}
