// js/components/toast.js — Toast notification system

let toastContainer;

function getContainer() {
  if (!toastContainer) toastContainer = document.getElementById('toast-container');
  return toastContainer;
}

const icons = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration  ms before auto-dismiss (0 = no auto-dismiss)
 */
export function showToast(message, type = 'success', duration = 3000) {
  const container = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] ?? '💬'}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  // Tap to dismiss
  toast.addEventListener('click', () => dismiss(toast));

  if (duration > 0) {
    setTimeout(() => dismiss(toast), duration);
  }

  return toast;
}

function dismiss(toast) {
  if (toast.classList.contains('exit')) return;
  toast.classList.add('exit');
  setTimeout(() => toast.remove(), 300);
}
