# Custom Dark-Theme Date Picker

Replace all native `<input type="date">` elements with a custom-built calendar date picker that matches the app's dark glassmorphism design.

## Proposed Changes

### New Component

#### [NEW] [date-picker.js](file:///c:/Users/Arihant Jain/Documents/GitHub/expense-tracker/js/components/date-picker.js)

A reusable custom date picker component:
- **Visual design**: Dark glass card with month/year header, day-of-week labels, and a 6-week grid
- **Navigation**: Left/right chevrons to move between months
- **Selection**: Tap a day to select it; selected day gets accent-colored highlight
- **Today indicator**: Subtle ring around today's date
- **Max date support**: Days after `max` are greyed out / disabled
- **Opens as a dropdown/popover** below the trigger button (not a full-screen modal)
- **Auto-closes** on date selection or outside click
- **Returns** the selected `YYYY-MM-DD` string via a callback
- **Trigger display**: A styled button showing the formatted date (e.g. "04 Aug 2026") replaces the native input

---

### CSS Updates

#### [MODIFY] [index.css](file:///c:/Users/Arihant Jain/Documents/GitHub/expense-tracker/css/index.css)

Add styles for:
- `.date-picker-trigger` — styled button that shows current date
- `.date-picker-dropdown` — the calendar popover container
- `.date-picker-header` — month/year + nav arrows
- `.date-picker-grid` — 7-column grid for days
- `.date-picker-day` — individual day cells with hover/selected/today/disabled states

---

### Integration Points (4 places)

#### [MODIFY] [settings.js](file:///c:/Users/Arihant Jain/Documents/GitHub/expense-tracker/js/views/settings.js)
- Replace export start/end `<input type="date">` with date picker triggers
- Wire up callbacks to update export date range

#### [MODIFY] [history.js](file:///c:/Users/Arihant Jain/Documents/GitHub/expense-tracker/js/views/history.js)
- Replace `hist-start` and `hist-end` date inputs with date picker triggers

#### [MODIFY] [dashboard.js](file:///c:/Users/Arihant Jain/Documents/GitHub/expense-tracker/js/views/dashboard.js)
- Replace `quick-date` input with date picker trigger

#### [MODIFY] [expense-form.js](file:///c:/Users/Arihant Jain/Documents/GitHub/expense-tracker/js/components/expense-form.js)
- Replace `expense-date` input with date picker trigger

---

## Design Preview

The picker will look like:

```
┌─────────────────────────────┐
│  ‹    August 2026     ›     │
├──┬──┬──┬──┬──┬──┬──────────┤
│Mo│Tu│We│Th│Fr│Sa│Su        │
├──┼──┼──┼──┼──┼──┼──────────┤
│  │  │  │  │  │ 1│ 2        │
│ 3│ 4│⬤5│ 6│ 7│ 8│ 9        │  ← today circled
│10│11│12│13│14│15│16        │
│17│18│19│20│21│22│23        │
│24│25│26│27│28│29│30        │
│31│  │  │  │  │  │          │
└─────────────────────────────┘
```

- Dark glass background matching app theme
- Accent-colored selected day
- Smooth fade-in animation
- Positioned as a dropdown below the trigger

## Verification Plan

### Manual Verification
- Test date picker on Settings export range
- Test on History page date range
- Test on Dashboard quick-add date
- Test on Add/Edit expense form date
- Verify max-date constraint works
- Verify month navigation
- Verify outside-click dismissal
