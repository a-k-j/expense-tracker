// js/utils/sheet-swipe.js — Swipe a bottom sheet down to close it

/**
 * Allow a bottom sheet to be dragged down and dismissed.
 *
 * @param {HTMLElement} el       Sheet element
 * @param {Function} onClose     Called when the drag passes the threshold
 * @param {object} [opts]
 * @param {number} [opts.threshold=100] Minimum downward drag in px
 */
export function addSwipeDownClose(el, onClose, { threshold = 100 } = {}) {
  let startY = 0;
  let dy = 0;
  let active = false;

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    // Let the sheet's own content scroll first; only drag from the top.
    if (el.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    dy = 0;
    active = true;
    el.style.transition = 'none';
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (!active) return;
    dy = e.touches[0].clientY - startY;

    if (dy <= 0) {
      el.style.transform = '';
      return;
    }

    // Keep the page from pull-to-refreshing while the sheet follows the finger.
    if (e.cancelable) e.preventDefault();
    el.style.transform = `translateX(-50%) translateY(${dy}px)`;
  }, { passive: false });

  const finish = () => {
    if (!active) return;
    active = false;
    el.style.transition = '';
    el.style.transform = '';

    if (dy > threshold) {
      onClose();
    }
    dy = 0;
  };

  el.addEventListener('touchend', finish, { passive: true });
  el.addEventListener('touchcancel', finish, { passive: true });
}
