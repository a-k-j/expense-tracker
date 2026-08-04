// js/components/category-grid.js — Responsive category selector grid

/**
 * Render a category selector grid into a container element
 * @param {HTMLElement} container
 * @param {Array} categories
 * @param {number|null} selectedId
 * @param {Function} onChange  — called with (categoryId) on selection
 */
export function renderCategoryGrid(container, categories, selectedId, onChange) {
  container.innerHTML = '';
  container.className = 'category-grid';

  for (const cat of categories) {
    const chip = document.createElement('button');
    chip.className   = 'category-chip' + (cat.id === selectedId ? ' selected' : '');
    chip.dataset.id  = cat.id;
    chip.setAttribute('aria-label', `Select category: ${cat.name}`);
    chip.setAttribute('aria-pressed', cat.id === selectedId ? 'true' : 'false');
    chip.style.setProperty('--chip-color', cat.color);

    chip.innerHTML = `
      <div class="category-chip-icon" style="background:${hexAlpha(cat.color, 0.18)}">
        ${cat.emoji}
      </div>
      <span class="category-chip-name">${cat.name}</span>
    `;

    chip.addEventListener('click', () => {
      // Deselect all
      container.querySelectorAll('.category-chip').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      // Select this
      chip.classList.add('selected');
      chip.setAttribute('aria-pressed', 'true');
      onChange(cat.id);

      // Pulse animation
      chip.animate([
        { transform: 'scale(0.92)' },
        { transform: 'scale(1.06)' },
        { transform: 'scale(1)' },
      ], { duration: 260, easing: 'cubic-bezier(0.34,1.56,0.64,1)' });
    });

    container.appendChild(chip);
  }
}

// Render a read-only category badge (for lists)
export function categoryBadge(cat) {
  return `
    <div class="category-chip-icon"
         style="width:32px;height:32px;border-radius:8px;background:${hexAlpha(cat.color,0.18)};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
      ${cat.emoji}
    </div>
  `;
}

// Helper: add alpha to an hsl() string  (works for hsl and hex)
function hexAlpha(color, alpha) {
  if (color.startsWith('hsl')) {
    return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  }
  return color; // fallback
}
