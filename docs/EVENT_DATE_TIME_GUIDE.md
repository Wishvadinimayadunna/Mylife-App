# 📅 Future Event Date & Time Guide

## Overview

This guide explains how the date and time system works in the Future Events module, especially for birthdays and recurring events.

---

## ⏰ Time Selection (NEW!)

### Quick Time Presets

When adding/editing an event, tap the **Time** field to open the time picker with these presets:

- **Morning (9:00 AM)** ☀️
- **Noon (12:00 PM)** 🌤️
- **Afternoon (2:00 PM)** 🌅
- **Evening (6:00 PM)** 🌆
- **Night (8:00 PM)** 🌙

### Custom Time Entry

You can also enter custom times in these formats:

- **12-hour format**: `9:00 AM`, `2:30 PM`, `11:45 PM`
- **24-hour format**: `09:00`, `14:30`, `23:45`

Quick preset buttons (Morning, Noon, Afternoon) also appear below the time field for instant selection.

---

## 📆 Date Selection

### Regular Events

For one-time events (meetings, interviews, vacations):

1. Tap the **Date** field
2. Select the exact date from the calendar
3. The date is saved as-is

**Example**: Meeting on March 15, 2026 → Select March 15, 2026

---

## 🎂 Birthdays & Anniversaries

### How It Works

#### For Recurring Yearly Events:

When you select **Birthday** or **Anniversary** type AND enable **"Recurring Yearly"**:

1. **What You Do**: Select the person's actual birth date (any year)
2. **What The System Does**: Automatically adjusts to the upcoming occurrence

#### Smart Auto-Adjustment Logic:

```
Example: Adding John's Birthday (Born March 10, 1990)
→ You select: March 10, 1990 (or any year)
→ System saves: March 10, 2026 (current year)
→ If March 10, 2026 has passed: March 10, 2027 (next year)
```

### Step-by-Step Example

**Scenario**: Today is February 16, 2026. You want to add John's birthday (born March 10, 1990).

1. **Event Title**: "John's Birthday"
2. **Event Type**: Select "Birthday" 🎂
3. **Enable**: "Recurring Yearly" switch ✅
4. **Select Date**: March 10 (can pick any year - 1990, 2026, doesn't matter)
5. **Result**: System automatically sets to **March 10, 2026** (upcoming occurrence)

---

## 🔄 Recurring Yearly Feature

### When To Use:

- Birthdays 🎂
- Anniversaries 💍
- Annual celebrations 🎉

### What It Does:

- Event repeats every year on the same date
- System shows **upcoming occurrence** only
- After the date passes, it auto-updates to next year's occurrence

### Visual Indicator:

Events with "Recurring Yearly" show a **🔁 Yearly** tag

---

## 💡 Helper Hints

### In-App Guidance

When adding a Birthday/Anniversary with Recurring Yearly enabled, you'll see:

```
💡 For recurring events, select the birth date.
   The year will auto-adjust to the upcoming occurrence.
```

This appears above the date picker to remind you how it works.

---

## 📊 Date Display

### Past Events:

- Show ⚠️ **Past** badge (red)
- Yellow background highlighting
- Can still be marked complete

### Upcoming Events:

- Show countdown: **"5d"**, **"Today"**, etc.
- Color-coded by event type
- Complete button available

### Completed Events:

- Grayed out appearance
- Strikethrough on title
- Moved to "Done" filter

---

## 🎯 Common Scenarios

### Scenario 1: Adding a Birthday Today

```
Date: February 16, 2026 (today)
Type: Birthday
Recurring: Yes
Result: Saved as February 16, 2026 (shows "Today" badge)
```

### Scenario 2: Adding Past Birthday

```
Date: January 5, 1985 (birthday date)
Type: Birthday
Recurring: Yes
Current: February 16, 2026
Result: Auto-adjusted to January 5, 2027 (next occurrence)
```

### Scenario 3: One-Time Event

```
Date: March 20, 2026
Type: Meeting
Recurring: No
Result: Saved as March 20, 2026 (exact date, no adjustment)
```

---

## 🔧 Technical Details

### Date Format

- **Storage**: ISO 8601 format (`YYYY-MM-DD`)
- **Display**: Localized format (`Mon, Mar 10, 2026`)
- **Comparison**: Start-of-day (00:00:00) for accurate filtering

### Time Format

- **Accepted**: Both 12-hour (AM/PM) and 24-hour
- **Storage**: String format as entered
- **Display**: As entered by user

---

## ✅ Best Practices

1. **For Birthdays**: Always enable "Recurring Yearly"
2. **For Anniversaries**: Enable "Recurring Yearly"
3. **For One-Time Events**: Leave "Recurring Yearly" off
4. **Time Selection**: Use presets for speed, custom for precision
5. **Past Events**: Mark as complete to move to "Done" filter

---

## 🆘 FAQ

**Q: I selected 1990 as the year for a birthday. Why does it show 2026?**
A: The system automatically adjusts recurring birthdays to the upcoming occurrence (current or next year).

**Q: What if I want to track the actual birth year?**
A: Add it in the event title: "John's Birthday (Born 1990)" or in the Notes field.

**Q: Can I have a birthday on the exact historical date?**
A: For historical tracking, disable "Recurring Yearly" and it will save the exact date selected.

**Q: Why can't I type the time directly?**
A: You can! Tap the time field, then tap "Or Enter Custom Time" in the picker modal.

**Q: The time presets don't have my exact time. What do I do?**
A: Use the custom time entry at the bottom of the time picker - you can enter any time you want.

---

**Happy Event Planning! 📅🎉**
