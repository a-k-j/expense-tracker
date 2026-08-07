# SpendSense — Personal Expense Tracker 💳

> **Fast, private, and offline-capable personal expense tracking web app.**

SpendSense is a modern, privacy-first Progressive Web Application (PWA) designed to help you effortlessly log daily expenses, set monthly budgets, track spending trends, and retain full control of your financial data.

---

## ✨ Key Features

- **🔒 100% Private & Local-First**: All your data stays strictly in your browser using IndexedDB. No accounts, no cloud sync, no tracking, and no external servers.
- **⚡ Progressive Web App (PWA)**: Works offline out of the box. Installable on iOS, Android, and Desktop like a native application.
- **⚡ Quick Add & Preset Amounts**: Log expenses in seconds with quick-preset buttons or the full-detail bottom sheet.
- **🎯 Monthly Budget & Smart Alerts**: Set a target monthly budget and receive automated progress bar updates and threshold notifications (50%, 75%, 90%, 100%).
- **📊 Analytics & Visual Insights**:
  - **Week-over-Week Comparison**: Track spending changes compared to the previous week.
  - **Daily Breakdown**: See day-by-day spending for the current week.
  - **30-Day Trend Line**: Interactive trend chart with stats (Highest Day, Daily Average, Monthly Total).
- **📅 Custom Dark Calendar Date Picker**: Popover date selection with past/future date support and smart date defaulting.
- **🏷️ Customizable Categories**: Add, edit, delete, and reorder categories with custom emoji and color palettes.
- **🔍 History & Advanced Filtering**: Filter past expenses by custom date ranges and category chips.
- **💾 Complete Data Portability**:
  - **CSV Export**: Export transactions for custom date ranges for analysis in Excel or Google Sheets.
  - **JSON Backup & Restore**: Backup your entire dataset to a JSON file and restore/merge anytime.

---

## 🚀 Quick Start / How to Run Locally

SpendSense is built using vanilla web technologies (HTML5, ES Modules, CSS3) and requires **no build step** or `npm install`.

### Prerequisites
Any static web server or browser with ES Module support.

### Running the App

#### Option 1: Using `npx serve` (Recommended)
```bash
# Navigate to the project directory
cd expense-tracker

# Start a static local server
npx serve .
```
Open `http://localhost:3000` in your browser.

#### Option 2: Using Python
```bash
# Python 3
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

#### Option 3: VS Code Live Server Extension
Right-click on `index.html` in VS Code and select **"Open with Live Server"**.

> 💡 **Note**: Service Workers and PWA capabilities require running over `localhost` or an `https://` protocol. Opening `index.html` directly via `file://` may disable offline caching and PWA installation.

---

## 📱 Installing as a PWA

SpendSense can be installed on your phone or computer for a full-screen, app-like experience:

- **iOS (Safari)**: Tap the **Share** button → select **"Add to Home Screen"**.
- **Android (Chrome)**: Tap the three-dot menu → select **"Install App"** or **"Add to Home Screen"**.
- **Desktop (Chrome/Edge)**: Click the **Install icon** in the browser address bar.

---

## 📖 User Guide

### 1. Dashboard (Home View)
- **Monthly Summary Card**: View total spending for the current month, today's total, entry count, and remaining budget balance.
- **Budget Progress Bar**: Visual progress fill that changes color as you approach or exceed your budget threshold.
- **Quick Add Bar**: Type an amount and pick a category chip for instant entry.
- **Category Grid**: Tap any category tile to quickly log an expense under that category.

### 2. Adding & Editing Expenses
- Tap the central **`+`** button in the bottom navigation bar to open the **Add Expense** bottom sheet.
- Input the **Amount**, pick a **Category**, select a **Date** (defaults to today or last used date), and add optional **Notes** or custom names.
- Under **History**, click any expense item to **Edit** or **Delete** it.

### 3. History & Filtering
- Navigate to the **History** tab (`# /history`).
- Use the **Start Date** and **End Date** calendar pickers to specify a custom date window.
- Filter transactions by tapping individual **Category Chips** or select **"All"**.
- Displays total spent and transaction counts for the selected filter.

### 4. Analytics & Trends
- Navigate to the **Analytics** tab (`#/analytics`).
- **Week-over-Week**: View a comparison of this week's total versus last week's total with delta percentages.
- **30-Day Spending Trend**: Track daily spending peaks and averages.

### 5. Settings & Data Management
- Navigate to the **Settings** tab (`#/settings`).
- **Monthly Budget**: Enter your monthly limit in rupees (₹) and tap **Save Budget**.
- **Categories Manager**: Add custom categories with chosen emojis & HSL color codes, or drag/reorder existing ones.
- **CSV Export**: Select a date range and download your expenses as a UTF-8 CSV file.
- **JSON Data Backup**: Create a full backup (`spendsense_backup_YYYY-MM-DD.json`).
- **JSON Data Restore**: Restore or merge backup files back into the browser storage.
- **Reset App**: Erase all data and reset to default categories.

---

## 🛠️ Architecture & Tech Stack

- **Frontend Core**: HTML5, Vanilla JavaScript (ES Modules, async/await).
- **Styling**: Vanilla CSS3 using custom CSS variables (design tokens), glassmorphism, dynamic gradients, and responsive typography (Inter font family).
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper) for client-side storage.
- **Offline / PWA**: Native Service Worker (`sw.js`) with cache-first assets caching strategy.
- **Iconography & Design System**: Custom inline SVGs and Apple touch icon assets.

### Database Schema (IndexedDB / `SpendSenseDB`)

```javascript
// Database name: SpendSenseDB (Version 1)
expenses:   '++id, date, categoryId, amount, createdAt, [date+categoryId]'
categories: '++id, name, order'
settings:   'key'
```

---

## 📂 Directory Structure

```
expense-tracker/
├── css/
│   └── index.css             # Main stylesheet & CSS design system
├── js/
│   ├── app.js                # App entry point, Router, & Navigation setup
│   ├── config.js             # App constants & versioning (v1.12.0)
│   ├── db.js                 # Dexie.js setup, schema definitions & CRUD helpers
│   ├── components/
│   │   ├── category-grid.js  # Category selection grid
│   │   ├── chart.js          # Bar charts & SVG trend lines
│   │   ├── date-picker.js    # Custom dark popover calendar
│   │   ├── expense-form.js   # Add/Edit expense bottom sheet modal
│   │   ├── expense-list.js   # Render expense lists with edit/delete actions
│   │   └── toast.js          # Feedback toast notification system
│   ├── utils/
│   │   ├── csv-export.js     # CSV file generator & downloader
│   │   ├── date-utils.js    # Date formatting & calculation utilities
│   │   └── json-backup.js   # Complete JSON export & import restore helpers
│   └── views/
│       ├── analytics.js      # Week-over-week & 30-day analytics view
│       ├── dashboard.js      # Main home dashboard view
│       ├── history.js        # History log view with date & category filters
│       └── settings.js       # Budget, category manager, export & backup view
├── icons/                    # App icons for PWA manifest & iOS
├── index.html                # Single Page Application HTML entry point
├── manifest.json             # Web App Manifest for PWA installation
├── sw.js                     # Service Worker for offline capability
└── README.md                 # Product documentation
```

---

## 🔒 Privacy & Security

SpendSense operates on a **zero-knowledge, offline-first** architecture:
- ❌ No user registration or login required.
- ❌ No telemetry, tracking scripts, or external analytics.
- ❌ No data sent to third-party servers.
- ✅ 100% of data remains local to your device's browser database.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
