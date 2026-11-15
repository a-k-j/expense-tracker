// js/utils/input-focus.js — Focus an amount input with the caret at the end

/**
 * Focus an input and place the caret after its current value.
 * Number inputs reject setSelectionRange, so we fall back to reassigning the
 * value, which moves the caret to the end in mobile and desktop browsers.
 *
 * @param {string|HTMLInputElement|null} target Element or element id
 */
export function focusAmountAtEnd(target) {
  const input = typeof target === 'string' ? document.getElementById(target) : target;
  if (!input) return;

  input.focus({ preventScroll: true });
  if (!input.value) return;

  const end = input.value.length;
  try {
    input.setSelectionRange(end, end);
  } catch (_) {
    // Number inputs don't support setSelectionRange; reassigning puts the caret at the end
    const value = input.value;
    input.value = '';
    input.value = value;
  }

  // Some mobile browsers move the caret after focus settles; re-assert once.
  requestAnimationFrame(() => {
    if (document.activeElement !== input) return;
    try {
      input.setSelectionRange(input.value.length, input.value.length);
    } catch (_) {
      // Value reassignment above already placed the caret at the end.
    }
  });
}
