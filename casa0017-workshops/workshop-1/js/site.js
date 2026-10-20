(function () {
  'use strict';

  function initSite(doc) {
    if (!doc) return;

    if (doc.documentElement?.classList) {
      doc.documentElement.classList.add('js');
    }

    for (const year of doc.querySelectorAll('[data-current-year]')) {
      year.textContent = String(new Date().getFullYear());
    }

    const toggle = doc.querySelector('[data-menu-toggle]');
    const navigation = doc.querySelector('[data-site-nav]');
    if (!toggle || !navigation) return;

    const setOpen = (isOpen) => {
      toggle.setAttribute('aria-expanded', String(isOpen));
      navigation.classList.toggle('is-open', isOpen);
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    for (const link of navigation.querySelectorAll('a')) {
      link.addEventListener('click', () => setOpen(false));
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initSite };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => initSite(document));
  }
})();
