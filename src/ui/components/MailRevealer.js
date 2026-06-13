// MailRevealer — anti-spam (LOT 10).
// Stratégie double :
//   1. HTML servi initialement = chaîne obfusquée ("cf85.pro [at] gmail [dot] com")
//      qui NE matche AUCUNE regex `\S+@\S+`.
//   2. Au hover/focus : reconstruction JS de l'adresse claire (jamais présente
//      en clair dans le HTML transmis par le serveur).
//   3. Bouton "Copier" → navigator.clipboard.writeText(adresse).
//
// Zéro allocation par hover : la string claire est mémoïsée à la 1ère reveal.

// Texte FR hardcodé (cf. décision LOT 10 polish — éviter le cache locale agressif).
const TXT = { label: 'Adresse de contact', copy: 'Copier', copied: 'Copié !', reveal: "Révéler l'adresse" };

const LOCAL = 'cf85.pro';
const DOMAIN = 'gmail.com';

function assemble() {
  // String.fromCharCode(64) === '@' — n'apparaît jamais sous forme littérale.
  return LOCAL + String.fromCharCode(64) + DOMAIN;
}

function obfuscated() {
  return LOCAL + ' [at] ' + DOMAIN.replace('.', ' [dot] ');
}

export function mountMailRevealer(container) {
  if (!container) throw new Error('MailRevealer: container manquant');

  const root = document.createElement('span');
  root.className = 'mail-reveal';
  root.setAttribute('aria-label', TXT.label);

  const display = document.createElement('span');
  display.className = 'mail-reveal__display';
  display.textContent = obfuscated();
  display.setAttribute('tabindex', '0');
  display.setAttribute('role', 'button');
  display.title = TXT.reveal;

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'mail-reveal__copy';
  copyBtn.textContent = '📋 ' + TXT.copy;

  let revealed = false;
  let cached = '';
  let resetTimer = 0;

  function reveal() {
    if (revealed) return;
    revealed = true;
    if (!cached) cached = assemble();
    display.textContent = cached;
    display.dataset.revealed = 'true';
  }

  async function onCopy() {
    if (!cached) cached = assemble();
    try {
      await navigator.clipboard.writeText(cached);
      const original = copyBtn.textContent;
      copyBtn.textContent = '✓ ' + TXT.copied;
      copyBtn.classList.add('is-copied');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.classList.remove('is-copied');
      }, 1500);
    } catch {
      // Clipboard refusé — révéler au moins le texte clair.
      reveal();
    }
  }

  display.addEventListener('mouseenter', reveal);
  display.addEventListener('focus',      reveal);
  copyBtn.addEventListener('click', onCopy);

  root.append(display, copyBtn);
  container.appendChild(root);

  return {
    el: root,
    destroy() {
      clearTimeout(resetTimer);
      display.removeEventListener('mouseenter', reveal);
      display.removeEventListener('focus',      reveal);
      copyBtn.removeEventListener('click', onCopy);
      root.remove();
    },
  };
}
