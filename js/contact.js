/* contact.js */
document.addEventListener('DOMContentLoaded', () => {
  renderHeader('contact'); renderFooter(); Toast.init();

  const form    = document.getElementById('contact-form');
  const btn     = document.getElementById('contact-btn');
  const errEl   = document.getElementById('contact-error');
  const successEl = document.getElementById('contact-success');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const name    = document.getElementById('c-name').value.trim();
    const email   = document.getElementById('c-email').value.trim();
    const subject = document.getElementById('c-subject').value;
    const message = document.getElementById('c-message').value.trim();

    if (!name)    { errEl.textContent = 'Veuillez indiquer votre nom.'; return; }
    if (!email.includes('@')) { errEl.textContent = 'Email invalide.'; return; }
    if (!message) { errEl.textContent = 'Veuillez écrire un message.'; return; }

    btn.disabled = true; btn.textContent = '⏳ Envoi…';
    try {
      await API.sendContact({ name, email, subject, message });
      form.style.display = 'none';
      successEl.style.display = 'block';
      Toast.show('✅ Message envoyé !');
    } catch (err) {
      errEl.textContent = err.message || 'Erreur lors de l\'envoi. Réessayez.';
      btn.disabled = false; btn.textContent = 'Envoyer le message →';
    }
  });
});
