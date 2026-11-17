# SpendSense — Personal Expense Tracker 💳

> **Fast, private, and offline-capable personal expense tracking web app.**

SpendSense is a modern, privacy-first Progressive Web Application (PWA) designed to help you effortlessly log daily expenses, set monthly budgets, track spending trends, and retain full control of your financial data.

---

## ✨ Key Features

- **🔒 100% Private & Local-First**: All your data stays strictly in your browser using IndexedDB. No accounts, no cloud sync, no tracking, and no external servers.
- **⚡ Progressive Web App (PWA)**: Works offline out of the box. Installable on iOS, Android, and Desktop like a native application.
- **⚡ Quick Add & Preset Amounts**: Log expenses in seconds with quick-preset buttons or the full-detail bottom sheet.
- **🎯 Monthly Budget & Smart Alerts**: Set a target monthly budget and receive automated progress bar updates and threshold notifications (50%, 75%, 90%, 100%). Expenses marked *Exclude from Analytics* don't count towards budget progress or alerts.
- **📊 Analytics & Visual Insights**:
  - **Lifestyle vs Money Flow**: Toggle between a rent-free lifestyle spending view and a full money-flow view of salary, investments, savings and what's left.
  - **Week-over-Week Comparison**: Track spending changes compared to the previous week.
  - **Daily Breakdown**: See day-by-day spending for the current week.
  - **30-Day Trend Line**: Interactive trend chart with stats (Highest Day, Daily Average, Monthly Total).
  - **Donut & Bar Charts**: A month-by-month lifestyle donut, allocation donut for inflow, plus a 6-month inflow vs outflow vs invested bar graph.
- **💰 Salary & Income Tracking**:
  - Set a default monthly take-home salary, with per-month overrides (e.g. a different amount for August).
  - Log extra income (from parents, bonuses, refunds, gifts) as first-class entries, then edit or delete any entry from Money Flow.
  - Mark categories as **Expense**, **Investment** or **Savings**, so SIPs count as invested without inflating lifestyle spending. The *Exclude from Analytics* toggle is hidden for investment and savings entries because they never count as lifestyle spending.
  - **Optional leftover carry-over**: Roll each month's unspent money into the next month, with a sub-toggle to decide whether overspending (negative leftover) should carry forward too.
- **📅 Custom Dark Calendar Date Picker**: Popover date selection with past/future date support and smart date defaulting.
- **🏷️ Customizable Categories**: Add, edit, delete, and reorder categories with custom emoji and color palettes.
- **🔍 History & Advanced Filtering**: Filter past expenses by custom date ranges and category chips.
- **💾 Complete Data Portability**:
  - **CSV Export**: Export transactions for custom date ranges for analysis in Excel or Google Sheets.
  - **JSON Backup & Restore**: Backup your entire dataset to a JSON file and restore/merge anytime.
  - **On-Device Auto Backup**: Automatic daily snapshots with configurable retention and manual snapshots, all stored locally.

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
- **Budget Progress Bar**: Visual progress fill that changes color as you approach or exceed your budget threshold, with both budget spent and month elapsed percentages.
- **Quick Add Bar**: Type an amount and pick a category chip for instant entry.
- **Category Grid**: Tap any category tile to quickly log an expense under that category.

### 2. Adding & Editing Expenses
- Tap the central **`+`** button in the bottom navigation bar to open the **Add Expense** bottom sheet.
- Input the **Amount**, pick a **Category**, select a **Date** (defaults to today or the last-used date, which stays sticky for 30 minutes), and add optional **Notes** or custom names. Past and future dates are both supported.
- Under **History**, click any expense item to **Edit** or **Delete** it.

### 3. History & Filtering
- Navigate to the **History** tab (`# /history`).
- Use the **Start Date** and **End Date** calendar pickers to specify a custom date window.
- Filter transactions by tapping individual **Category Chips** or select **"All"**.
- Toggle the sort button between **Newest first** and **Oldest first**.
- Displays total spent and transaction counts for the selected filter.

### 4. Analytics & Trends
- Navigate to the **Analytics** tab (`#/analytics`).
- Use the **Lifestyle / Money Flow** toggle at the top.
- **Lifestyle** excludes rent, investments, savings and anything marked *Exclude from Analytics*. It shows:
  - **Week-over-Week**: A comparison of this week's total versus last week's total with delta percentages.
  - **30-Day Spending Trend**: Daily spending peaks and averages.
  - **Where It Went**: A donut of lifestyle spending by category for the month you pick. Use the in-app month picker to look back at any month, then tap a slice or legend row to see the transactions behind it, or press and hold a slice to preview its category and amount.
- **Money Flow** shows the whole month:
  - **Total Inflow** = the month's salary (default or per-month override) plus any extra income entries.
  - **KPI cards** for Spent, Invested, Saved and Left (or Overspent), with percentages of available money.
  - **Optional carry-over** adds the previous month's leftover to this month's available money. If negative carry-over is turned off, overspending resets the carried amount to zero instead of reducing next month.
  - **Where the money went** donut: rent & utilities, lifestyle, investments, savings and left unspent.
  - **Tap any slice or legend row** to see the transactions behind it, or **press and hold** a slice for a quick category + amount preview.
  - The detail sheet can be dismissed with the Close button, the overlay, `Esc`, or by swiping it down.
  - **Last 6 months** bar graph comparing inflow, outflow and investments.
  - **Edit salary** for the selected month, or **+ Income** to add money from parents, a bonus, refund or gift.

### 5. Settings & Data Management
- Navigate to the **Settings** tab (`#/settings`).
- **Monthly Budget**: Enter your monthly limit in rupees (₹) and tap **Save Budget**.
- **Default Monthly Salary**: Set the take-home salary used for months without an override, then fine-tune individual months inside Money Flow.
- **Carry over leftover**: Add each month's unspent money to the next month. Use the sub-toggle if overspending should also reduce next month's available money. Turning carry-over off also turns this sub-toggle off.
- **Categories Manager**: Add custom categories with chosen emojis & HSL color codes, set their **Type** (Expense / Investment / Savings), or drag/reorder existing ones.
- **CSV Export**: Select a date range and download your expenses as a UTF-8 CSV file.
- **JSON Data Backup**: Create a full backup (`spendsense_backup_YYYY-MM-DD.json`).
- **JSON Data Restore**: Restore or merge backup files back into the browser storage.
- **Automatic On-Device Backups**: Daily snapshots stored in IndexedDB. Choose how many automatic backups to keep (older ones are pruned automatically), create a manual **Backup Now** snapshot, or restore/delete any saved backup. Manual backups are never pruned automatically.
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
// Database name: SpendSenseDB (Version 3)
expenses:   '++id, date, categoryId, amount, createdAt, [date+categoryId]'
categories: '++id, name, order'          // includes bucket: expense | investment | savings
settings:   'key'                        // budget, defaultSalary, salaryByMonth, ...
backups:    '++id, createdAt, type'
incomes:    '++id, date, createdAt'      // extra income: parents, bonus, refund, gift
```

`salaryByMonth` stores per-month overrides as `{ "2026-08": 45000 }`; months without an entry fall back to `defaultSalary`.

---

## 📂 Directory Structure

```
expense-tracker/
├── css/
│   └── index.css             # Main stylesheet & CSS design system
├── js/
│   ├── app.js                # App entry point, Router, & Navigation setup
│   ├── config.js             # App constants & versioning (v1.25.0)
│   ├── db.js                 # Dexie.js setup, schema definitions & CRUD helpers
│   ├── components/
│   │   ├── category-grid.js  # Category selection grid
│   │   ├── chart.js          # Bar charts, SVG trend lines, donuts & grouped bars
│   │   ├── date-picker.js    # Custom dark popover calendar
│   │   ├── expense-form.js   # Add/Edit expense bottom sheet modal
│   │   ├── expense-list.js   # Render expense lists with edit/delete actions
│   │   ├── income-form.js    # Add income & per-month salary bottom sheets
│   │   ├── month-picker.js   # Custom dark month dropdown (no OS select menu)
│   │   └── toast.js          # Feedback toast notification system
│   ├── utils/
│   │   ├── auto-backup.js    # On-device snapshots, retention & restore logic
│   │   ├── csv-export.js     # CSV file generator & downloader
│   │   ├── date-utils.js     # Date formatting & calculation utilities
│   │   ├── input-focus.js    # Caret-at-end focus helper for amount inputs
│   │   ├── json-backup.js    # Complete JSON export & import restore helpers
│   │   └── sheet-swipe.js    # Swipe-down-to-close behaviour for bottom sheets
│   └── views/
│       ├── analytics.js      # Lifestyle analytics + Money Flow (salary/income/investments)
│       ├── dashboard.js      # Main home dashboard view
│       ├── history.js        # History log view with date & category filters
│       └── settings.js       # Budget, salary, category manager, export & backup view
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
