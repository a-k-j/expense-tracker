# Personal Expense Tracker — PWA

A mobile-first Progressive Web App for tracking daily expenses across customizable categories, with CSV export. No backend required — everything runs and stores data locally on your phone.

---

## Architecture Decision: Why a PWA?

Since you're the **only user**, we don't need a server, database, or authentication. A PWA gives us:

| Benefit | Detail |
|---|---|
| **Install on phone** | Add to home screen → launches full-screen like a native app |
| **Works offline** | Service Worker caches everything; no internet needed to log expenses |
| **Zero hosting cost** | Deploy as a static site on GitHub Pages (free) or just open the HTML file |
| **No backend** | Data lives in your browser's IndexedDB — persistent, fast, and private |
| **CSV export** | Pure JS generates and downloads CSV files on-demand |

> [!IMPORTANT]
> **Data lives in your browser's IndexedDB.** Clearing browser data / uninstalling the browser will erase it. The CSV export feature acts as your backup mechanism. We'll also add a JSON backup/restore feature for safety.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Structure** | HTML5 | Semantic, accessible markup |
| **Styling** | Vanilla CSS | Full control, CSS custom properties for theming, no build step |
| **Logic** | Vanilla JavaScript (ES Modules) | No framework overhead, fast, simple |
| **Local DB** | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) | Clean Promise-based API over IndexedDB; ~40KB |
| **Offline** | Service Worker | Cache-first strategy for all assets |
| **Icons** | Lucide Icons (CDN) | Lightweight, clean SVG icon set |
| **Font** | Inter (Google Fonts) | Modern, highly readable on mobile |
| **Export** | Native JS Blob + download | CSV and JSON export, no library needed |
| **Hosting** | GitHub Pages / local file | Free, zero-config static hosting |

> [!NOTE]
> No build tools (Webpack, Vite, etc.) are needed. The app is a collection of static files — just open `index.html` or push to GitHub Pages. Dexie.js and icons are loaded from CDN.

---

## UI/UX Design

### Design Philosophy
- **Mobile-first**: Designed for thumb-friendly one-handed use on phones
- **Minimal friction**: Log an expense in **2 taps + 1 number entry** (amount → category → done)
- **Dark mode by default**: Easy on the eyes, premium feel
- **Glassmorphism + gradients**: Modern, polished aesthetic

### Screens / Views

#### 1. **Dashboard (Home)**
The main screen. Shows:
- **Quick-add bar** at the top: amount input + category grid → one-tap logging
- **Today's total** prominently displayed
- **Recent expenses** list (last 10-15 entries) with swipe-to-delete
- **Monthly summary** bar chart at bottom showing spend per category
- Floating "+" button as an alternative entry point

#### 2. **History / All Expenses**
- Filterable by date range and category
- Grouped by day with daily totals
- Search functionality
- Each entry shows: amount, category, note (optional), timestamp
- Swipe to delete, tap to edit

#### 3. **Categories Manager**
- View all categories with icons and colors
- Add new custom categories with name, icon, and color
- Edit / delete existing categories (prevent deletion if expenses exist, or offer reassignment)
- Drag to reorder (priority on quick-add grid)

#### 4. **Export & Backup**
- **Export CSV**: Select date range → download CSV with columns: `Date, Amount, Category, Note`
- **Export JSON**: Full data backup (expenses + categories)
- **Import JSON**: Restore from backup
- **Clear All Data**: With confirmation dialog

#### 5. **Settings** (minimal)
- Currency symbol (₹ default)
- Monthly budget goal (optional, shows progress bar on dashboard)

### Navigation
- Bottom tab bar with 3 tabs: **Home** | **History** | **Settings**
- Categories and Export accessible from Settings

---

## Data Model (IndexedDB via Dexie.js)

### `expenses` table
| Field | Type | Description |
|---|---|---|
| `id` | auto-increment | Primary key |
| `amount` | Number | Expense amount |
| `categoryId` | Number | FK to categories table |
| `note` | String (optional) | Short description |
| `date` | Date | When the expense occurred |
| `createdAt` | Date | When the record was created |

**Indexes**: `date`, `categoryId`, `[date+categoryId]` (compound for filtered queries)

### `categories` table
| Field | Type | Description |
|---|---|---|
| `id` | auto-increment | Primary key |
| `name` | String | e.g., "Food", "Tea/Coffee" |
| `icon` | String | Lucide icon name |
| `color` | String | HSL color string |
| `order` | Number | Display order in quick-add grid |
| `isDefault` | Boolean | Whether it's a built-in category |

### Default Categories (Pre-seeded)

| Category | Icon | Color |
|---|---|---|
| 🍔 Food | `utensils` | `hsl(25, 95%, 55%)` (warm orange) |
| ☕ Tea/Coffee | `coffee` | `hsl(30, 70%, 45%)` (brown) |
| 🏍️ Bike/Auto/Cab | `car` | `hsl(210, 80%, 55%)` (blue) |
| ⛽ Petrol | `fuel` | `hsl(350, 80%, 55%)` (red) |
| 🛒 Groceries | `shopping-cart` | `hsl(140, 65%, 45%)` (green) |
| 💊 Health | `heart-pulse` | `hsl(330, 70%, 55%)` (pink) |
| 🎬 Entertainment | `film` | `hsl(270, 70%, 60%)` (purple) |
| 📦 Other | `package` | `hsl(220, 15%, 55%)` (gray) |

---

## File Structure

```
expense-tracker/
├── index.html              # Single page app shell
├── manifest.json           # PWA manifest (name, icons, theme)
├── sw.js                   # Service Worker for offline caching
├── css/
│   └── index.css           # All styles (custom properties, components, layouts)
├── js/
│   ├── app.js              # Main app initialization, routing, view management
│   ├── db.js               # Dexie.js database setup, schema, seed data
│   ├── views/
│   │   ├── dashboard.js    # Dashboard view (quick-add, today summary, chart)
│   │   ├── history.js      # History/list view with filters
│   │   └── settings.js     # Settings, categories, export/import
│   ├── components/
│   │   ├── expense-form.js # Add/edit expense modal
│   │   ├── category-grid.js# Quick-select category grid
│   │   ├── expense-list.js # Scrollable expense list component
│   │   ├── chart.js        # Simple bar chart (canvas or CSS-based)
│   │   └── toast.js        # Toast notification component
│   └── utils/
│       ├── csv-export.js   # CSV generation and download
│       ├── json-backup.js  # JSON export/import for full backup
│       └── date-utils.js   # Date formatting and range helpers
└── icons/
    ├── icon-192.png        # PWA icon
    └── icon-512.png        # PWA icon (splash)
```

---

## Proposed Changes (Implementation Order)

### Phase 1: Foundation

#### [NEW] `index.html`
- HTML5 app shell with viewport meta for mobile
- Links to CSS and JS modules
- Bottom navigation bar structure
- View containers for SPA routing

#### [NEW] `manifest.json`
- PWA manifest: app name, theme color, display: standalone, icons

#### [NEW] `css/index.css`
- CSS custom properties (colors, spacing, typography, shadows)
- Dark theme with glassmorphism cards
- Mobile-first responsive layout
- Component styles (buttons, inputs, cards, modals, bottom nav)
- Animations (slide-in, fade, scale)

---

### Phase 2: Data Layer

#### [NEW] `js/db.js`
- Dexie.js database initialization
- Schema definition for `expenses` and `categories` tables
- Seed default categories on first run
- CRUD helper functions for expenses and categories

#### [NEW] `js/utils/date-utils.js`
- `formatDate()`, `formatTime()`, `getToday()`, `getMonthRange()`
- Date range helpers for filtering

---

### Phase 3: Core Views

#### [NEW] `js/app.js`
- SPA router (hash-based: `#/`, `#/history`, `#/settings`)
- View lifecycle management (mount/unmount)
- Global state (current view, selected date range)

#### [NEW] `js/views/dashboard.js`
- Quick-add expense flow: amount input → category grid → save
- Today's total and running monthly total
- Recent expenses list (last 10)
- Monthly category breakdown chart

#### [NEW] `js/components/category-grid.js`
- Responsive grid of category buttons with icons and colors
- Tap to select category during expense entry

#### [NEW] `js/components/expense-form.js`
- Modal/bottom-sheet for adding/editing expenses
- Amount (numeric keypad-optimized input), category, optional note, date
- Save and delete actions

#### [NEW] `js/components/expense-list.js`
- Scrollable list of expenses grouped by day
- Each item: amount, category badge, note, time
- Swipe-to-delete gesture support
- Tap to edit

#### [NEW] `js/components/chart.js`
- CSS-based horizontal bar chart (no canvas library needed)
- Shows category-wise spending for selected month
- Animated bars with category colors

---

### Phase 4: History & Filters

#### [NEW] `js/views/history.js`
- Full expense history with date range picker
- Category filter chips
- Grouped-by-day layout with daily totals
- Uses expense-list component

---

### Phase 5: Settings, Export & Backup

#### [NEW] `js/views/settings.js`
- Currency symbol setting
- Monthly budget goal
- Category management (add/edit/delete/reorder)
- Export CSV / Export JSON / Import JSON buttons
- Clear all data (with confirmation)

#### [NEW] `js/utils/csv-export.js`
- Generate CSV string from expense data
- Columns: `Date, Time, Amount, Category, Note`
- Trigger browser download with date-range in filename
- Handles special characters / commas in notes

#### [NEW] `js/utils/json-backup.js`
- Export all data (expenses + categories + settings) as JSON
- Import JSON with validation and conflict handling
- Useful as a full backup/restore mechanism

---

### Phase 6: PWA & Offline

#### [NEW] `sw.js`
- Cache-first strategy for all static assets
- Cache Dexie.js CDN resource
- Handle updates gracefully

#### [NEW] `js/components/toast.js`
- Non-intrusive toast notifications
- "Expense added ✓", "Exported successfully", "Data restored" etc.

#### [NEW] `icons/icon-192.png` and `icons/icon-512.png`
- Generated app icons for PWA install

---

## User Review Required

> [!IMPORTANT]
> **Data persistence**: Your data lives in the browser's IndexedDB. It persists across sessions and page refreshes, but **clearing browser data or uninstalling the browser will erase it**. The CSV and JSON export features serve as your backup. Is this acceptable, or would you prefer a cloud-synced solution (adds complexity: backend + auth)?

> [!IMPORTANT]
> **Hosting**: The simplest option is to push to a GitHub repo and enable GitHub Pages — you'd access it via `https://yourusername.github.io/expense-tracker/`. Alternatively, you can just open the `index.html` file directly (PWA install won't work without HTTPS though). Which do you prefer?

---

## Open Questions

1. **Currency**: Should the default currency be ₹ (INR)? Should it be changeable in settings?

2. **Recurring expenses**: Do you want support for recurring/scheduled expenses (e.g., "₹500 petrol every Sunday")? This adds complexity — I'd suggest skipping it for v1.

3. **Budget alerts**: Do you want notifications when you exceed a monthly budget? (Possible with PWA notifications, but adds complexity.)

4. **Multiple expense entry**: Would you like a "batch mode" to quickly log multiple expenses (e.g., at end of day), or is one-at-a-time fine?

5. **Charts/Analytics**: Beyond the monthly category breakdown, do you want:
   - Week-over-week comparison?
   - Daily spending trend line?
   - Or keep it simple for v1?

---

## Verification Plan

### Automated Tests
- No test framework for v1 (keeping it simple). Manual testing on mobile.

### Manual Verification
1. **Mobile usability**: Open on phone browser, test the full flow: add expense → view dashboard → check history → export CSV
2. **PWA install**: Verify "Add to Home Screen" prompt works on Android Chrome
3. **Offline**: Enable airplane mode → verify app loads and expenses can be added
4. **CSV export**: Download CSV, open in Excel/Google Sheets, verify columns and data
5. **JSON backup/restore**: Export data → clear all → import → verify data restored
6. **Category management**: Add custom category → use it → verify it appears in exports
7. **Responsiveness**: Test on different phone screen sizes
