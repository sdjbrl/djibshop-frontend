/* ══════════════════════════════════════════════
   auth.js — Login & Register Logic
   ══════════════════════════════════════════════ */

/* ─── LOGIN ──────────────────────────────────── */
function initLogin() {
  // If already logged in, redirect
  if (Storage.getSession()) { window.location.href = '/account'; return; }

  renderHeader('login');
  renderFooter();
  Toast.init();

  const form  = document.getElementById('login-form');
  const emailI= document.getElementById('login-email');
  const passI = document.getElementById('login-pass');
  const errEl = document.getElementById('login-error');
  const btnEl = document.getElementById('login-btn');
  const eyeBtn= document.getElementById('login-eye');

  // Toggle password visibility
  if (eyeBtn) {
    eyeBtn.addEventListener('click', () => {
      const t = passI.type === 'password' ? 'text' : 'password';
      passI.type = t;
      eyeBtn.textContent = t === 'password' ? '👁' : '🙈';
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const email = emailI.value.trim().toLowerCase();
    const pass  = passI.value;
    if (!email || !pass) { errEl.textContent = 'Veuillez remplir tous les champs.'; return; }

    btnEl.disabled = true;
    btnEl.textContent = 'Connexion…';
    await delay(600);

    const user = Storage.getUserByEmail(email);
    if (!user || user.password !== pass) {
      errEl.textContent = 'Email ou mot de passe incorrect.';
      btnEl.disabled = false; btnEl.textContent = 'Se connecter';
      return;
    }
    Storage.setSession(user);
    Toast.show('Bienvenue, ' + user.name + ' ! 👋');
    setTimeout(() => {
      window.location.href = user.isAdmin ? '/admin' : '/account';
    }, 700);
  });
}

/* ─── REGISTER ───────────────────────────────── */
function initRegister() {
  if (Storage.getSession()) { window.location.href = '/account'; return; }

  renderHeader('register');
  renderFooter();
  Toast.init();

  const form   = document.getElementById('reg-form');
  const nameI  = document.getElementById('reg-name');
  const emailI = document.getElementById('reg-email');
  const passI  = document.getElementById('reg-pass');
  const pass2I = document.getElementById('reg-pass2');
  const btnEl  = document.getElementById('reg-btn');
  const errEl  = document.getElementById('reg-error');
  const eyeBtn = document.getElementById('reg-eye');
  const eye2Btn= document.getElementById('reg-eye2');

  const toggleEye = (btn, input) => btn.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });
  if (eyeBtn)  toggleEye(eyeBtn,  passI);
  if (eye2Btn) toggleEye(eye2Btn, pass2I);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const name  = nameI.value.trim();
    const email = emailI.value.trim().toLowerCase();
    const pass  = passI.value;
    const pass2 = pass2I.value;

    if (!name)  { errEl.textContent = 'Nom requis.'; return; }
    if (!email.includes('@')) { errEl.textContent = 'Email invalide.'; return; }
    if (pass.length < 6) { errEl.textContent = 'Mot de passe : min 6 caractères.'; return; }
    if (pass !== pass2) { errEl.textContent = 'Les mots de passe ne correspondent pas.'; return; }
    if (Storage.getUserByEmail(email)) { errEl.textContent = 'Un compte existe déjà avec cet email.'; return; }

    btnEl.disabled = true; btnEl.textContent = 'Création…';
    await delay(700);

    const newUser = {
      id:        'u_' + Date.now(),
      name,
      email,
      password:  pass,
      isAdmin:   false,
      createdAt: new Date().toISOString(),
    };
    Storage.saveUser(newUser);
    Storage.setSession(newUser);

    // Show success
    const box = document.querySelector('.auth-box');
    if (box) {
      box.innerHTML = `
        <div class="auth-success">
          <div class="auth-success-icon">🎉</div>
          <div class="auth-success-title">Compte créé !</div>
          <div class="auth-success-sub">Bienvenue, ${name} ! Redirection…</div>
        </div>`;
    }
    setTimeout(() => window.location.href = '/account', 1200);
  });
}

/* ─── LOGOUT ─────────────────────────────────── */
function logout() {
  Storage.clearSession();
  window.location.href = '/';
}

/* ─── UTIL ───────────────────────────────────── */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
