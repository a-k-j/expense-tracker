// js/app.js — Main app entry: router, view lifecycle, global nav

import { seedIfEmpty } from './db.js';
import { initExpenseForm, openAddExpense } from './components/expense-form.js';
import { renderDashboard }  from './views/dashboard.js';
import { renderHistory }    from './views/history.js';
import { renderAnalytics }  from './views/analytics.js';
import { renderSettings }   from './views/settings.js';
import { getCategories }    from './db.js';

// ── State ─────────────────────────────────────────────────────────────────────
let currentView = 'dashboard';

const VIEWS = {
  dashboard: renderDashboard,
  history:   renderHistory,
  analytics: renderAnalytics,
  settings:  renderSettings,
};

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  // Register service worker & check for updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
    }).catch(() => {});
  }

  // Seed default data
  await seedIfEmpty();

  // Init expense form (attaches overlay listener)
  initExpenseForm();

  // Hide splash
  const splash = document.getElementById('splash');
  setTimeout(() => {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 500);
  }, 800);

  // Setup navigation
  setupNav();

  // Navigate to initial view
  const hash = location.hash.replace('#/', '') || 'dashboard';
  const view = VIEWS[hash] ? hash : 'dashboard';
  await navigateTo(view, false);
}

// ── Router ────────────────────────────────────────────────────────────────────
async function navigateTo(viewName, pushHistory = true) {
  if (!VIEWS[viewName]) viewName = 'dashboard';

  currentView = viewName;

  // Update nav buttons
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    const active = btn.dataset.view === viewName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });

  // Update hash
  if (pushHistory) {
    history.pushState({ view: viewName }, '', `#/${viewName}`);
  }

  // Render view
  const container = document.getElementById('main-content');
  container.setAttribute('aria-busy', 'true');

  try {
    await VIEWS[viewName](container);
  } catch (err) {
    console.error('View render error:', err);
    container.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary mt-md" onclick="location.reload()">Reload</button>
        </div>
      </div>`;
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}

// ── Navigation setup ──────────────────────────────────────────────────────────
function setupNav() {
  // Tab buttons
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === currentView) {
        // Tap current tab to scroll to top
        document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      navigateTo(view);
    });
  });

  // Center + (add) button
  document.getElementById('nav-add').addEventListener('click', async () => {
    const categories = await getCategories();
    openAddExpense(null, () => {
      // Refresh current view after adding
      navigateTo(currentView, false);
    });
  });

  // Browser back/forward
  window.addEventListener('popstate', (e) => {
    const view = e.state?.view || 'dashboard';
    navigateTo(view, false);
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
boot().catch(console.error);
