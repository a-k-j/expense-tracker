// js/components/confirm-dialog.js — Custom confirmation dialog

/**
 * Show a styled confirmation dialog (replaces native confirm())
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} [options.confirmText='Delete'] - Confirm button text
 * @param {string} [options.cancelText='Cancel'] - Cancel button text
 * @param {'danger'|'warning'|'info'} [options.variant='danger'] - Visual style
 * @returns {Promise<boolean>} - Resolves true if confirmed, false if cancelled
 */
export function showConfirm({
  title = 'Are you sure?',
  message = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
} = {}) {
  return new Promise((resolve) => {
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    // Dialog
    const dialog = document.createElement('div');
    dialog.className = `confirm-dialog confirm-${variant}`;
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirm-title');
    dialog.setAttribute('aria-describedby', 'confirm-msg');

    const iconMap = { danger: '🗑️', warning: '⚠️', info: 'ℹ️' };

    dialog.innerHTML = `
      <div class="confirm-icon confirm-icon-${variant}">${iconMap[variant] || '❓'}</div>
      <h3 class="confirm-title" id="confirm-title">${title}</h3>
      ${message ? `<p class="confirm-message" id="confirm-msg">${message}</p>` : ''}
      <div class="confirm-actions">
        <button class="confirm-btn confirm-btn-cancel" id="confirm-cancel">${cancelText}</button>
        <button class="confirm-btn confirm-btn-confirm confirm-btn-${variant}" id="confirm-ok">${confirmText}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('confirm-visible');
    });

    function close(result) {
      overlay.classList.remove('confirm-visible');
      overlay.addEventListener('transitionend', () => {
        overlay.remove();
        resolve(result);
      }, { once: true });
      // Fallback in case transitionend doesn't fire
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
          resolve(result);
        }
      }, 400);
    }

    dialog.querySelector('#confirm-cancel').addEventListener('click', () => close(false));
    dialog.querySelector('#confirm-ok').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    // Trap focus
    dialog.querySelector('#confirm-cancel').focus();

    // Esc key to cancel
    function onKey(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        close(false);
      }
    }
    document.addEventListener('keydown', onKey);
  });
}
