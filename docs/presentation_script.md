# MyLife App — 13-Minute Video Presentation Script

This script is structured to guide you through a comprehensive, step-by-step walkthrough of the **MyLife** application. It balances high-level concept explanations, live UI demonstrations, and subtle highlights of the technical stack (React Native/Expo, TypeScript, Zustand, Node.js, Express, and MongoDB).

---

## 📅 Presentation Overview

| Section | Timing | Screen Focus | Key Actions to Demonstrate |
| :--- | :--- | :--- | :--- |
| **1. Intro & Concept** | `00:00 - 01:15` | Welcome & Auth Screens | Introduce core concept; demonstrate Login & Register flows; explain JWT authentication and Axios interceptors. |
| **2. Home Dashboard** | `01:15 - 02:30` | Tab Home Screen | Dynamic greeting; quick stats chips; 8-card grid layout; upcoming events preview widget. |
| **3. Profile & Settings** | `02:30 - 03:45` | Profile Screen & Settings Tab | Editing profile fields; uploading profile photo via Expo Image Picker; viewing credentials in Settings. |
| **4. Family Directory** | `03:45 - 05:00` | Family Screen | Immediate vs. Extended filters; adding a member; toggle birthday reminders (scheduled 1 day prior at 9:00 AM). |
| **5. Shopping Lists** | `05:00 - 06:15` | Shopping Screen | Urgent items vs. Monthly Essentials; natural language bulk addition; smart auto-categorization; shared partner sync. |
| **6. Health Centre** | `06:15 - 07:45` | Health Screen (4 Tabs) | Wellness avatar & score; quick-logging water, sleep, mood, medicines; wellness streaks; period prediction calendar. |
| **7. To-Do Checklist** | `07:45 - 09:00` | To-Do Screen | Segmented tabs; inline composer; custom task recurrences; expandable subtask progress bars. |
| **8. Utility Tracker** | `09:00 - 10:15` | Utility Screen | Visual status groups (Overdue/Due Soon/Settled); quick-adding bills; automated due date local reminders. |
| **9. Finance Dashboard** | `10:15 - 11:30` | Finance Screen | Net Balance card; dynamic budget alerts (Caution/Warning/Danger); custom category selectors; adding ledger entries. |
| **10. Events & Voice NLP** | `11:30 - 12:30` | Future Events Screen | Countdowns; showing off the Natural Language voice parsing engine by typing/speaking an event description. |
| **11. Spouse Sync & Outro**| `12:30 - 13:00` | Settings Screen | Real-time spouse account linking; visual overview of shared syncing; final logout and outro. |

---

## 🎙️ Detailed Scene Script

### Section 1: Introduction & App Concept
**Timing:** `00:00 - 01:15` (1 min 15 sec)  
**Visual Focus:** Show the phone simulator or physical device showing the **Welcome Screen** (landing page with the app title "MyLife", clean features grid, and buttons "Get Started" and "I already have an account").
* **Visual Actions:**
  1. Hover on the screen elements.
  2. Tap **I already have an account** to show the Login Screen.
  3. Tap **Sign Up** to transition to the Register Screen.
  4. Type in credentials (e.g., Name, Email, Password) and click **Sign In** to navigate to the dashboard.

> **Narrator:**
> "Welcome! Today, I am excited to take you on a complete walkthrough of **MyLife**, a premium, universal life management ecosystem. In a world where our daily details are scattered across calendars, notes, financial ledgers, and family chats, MyLife brings everything together in one secure, beautiful dashboard.
>
> Under the hood, MyLife is built as a highly responsive React Native and Expo application written in TypeScript, backed by a robust Node.js and MongoDB database. Let's start with onboarding. Security is at the core of the app. It uses JWT token-based authentication. The app has automatic token restoration, so users don't have to re-login every time they open it. Furthermore, the networking layer features custom Axios interceptors. If a session expires, the app securely intercepts the 401 error, cleans the local state, and routes the user back to this login screen safely. Let's log in and see the magic."

---

### Section 2: Home Dashboard
**Timing:** `01:15 - 02:30` (1 min 15 sec)  
**Visual Focus:** The **Home Dashboard** loads. Point out the dark header banner and the grid.
* **Visual Actions:**
  1. Highlight the Greeting ("Good Morning, John 👋") and the current date.
  2. Highlight the three stat count indicators (Shopping, Tasks, Upcoming) inside the banner.
  3. Scroll down the grid showing all 8 module cards: Profile, Family, Shopping, Health, Utility, To-Do, Finance, and Events.
  4. Hover over the **Upcoming Events** widget at the bottom.

> **Narrator:**
> "And here we are on the main MyLife Dashboard. Immediately, you are greeted with a premium, clean design. The hero banner dynamically adapts its greeting depending on the hour of the day and loads the user's name directly from the global state managed by Zustand. 
> 
> Right below the greeting, we have high-level overview chips. These display, at a glance, how many shopping list items are active, pending tasks you have, and upcoming events are scheduled for today. 
>
> The center of the dashboard organizes daily life into 8 core modules. Each has its own dedicated card with consistent spacing, card styling, and custom indicators that reflect real-time counts, such as how many unpaid utility bills or pending tasks are left. At the bottom, a quick upcoming events widget gives us a clear preview of countdowns and dates so you never get caught off guard."

---

### Section 3: Profile & Settings
**Timing:** `02:30 - 03:45` (1 min 15 sec)  
**Visual Focus:** Tap on the **Profile** card to open `/profile`.
* **Visual Actions:**
  1. Click **Edit Profile** to toggle edit mode.
  2. Modify a field (e.g., Address or Phone Number).
  3. Tap the avatar placeholder to open the image selector (simulating Expo Image Picker gallery selection).
  4. Tap **Save Profile** to commit changes to the backend.
  5. Go back to the dashboard, click the top-right initials avatar to show the **Settings** screen.

> **Narrator:**
> "First, let's look at profile management. Tapping the Profile module takes us to a detailed configuration screen. Here, users can store essential contact information, gender selection, and their address. 
> 
> By clicking edit, the fields turn into validate-ready inputs. We can tap on the profile avatar, which triggers the Expo Image Picker, allowing users to upload a custom profile picture directly from their system library. Tapping save commits this data to our MongoDB database via the profile service layer. 
> 
> Tapping the initials avatar in the top right corner of the dashboard takes us to Settings, where we can view our active email, check platform details, sync partner accounts, or logout."

---

### Section 4: Family Directory
**Timing:** `03:45 - 05:00` (1 min 15 sec)  
**Visual Focus:** Navigate to `/family`.
* **Visual Actions:**
  1. Toggle between the tabs: **All**, **Immediate**, and **Extended**.
  2. Use the inline composer to quickly add a member. Type a name (e.g., "Emma"), select relationship "Wife", pick a DOB, and type a phone number.
  3. Click the upload button to submit.
  4. Expand a card to see extra details like Address and Gender.
  5. Click the Bell icon on a member's card to toggle birthday reminders.

> **Narrator:**
> "Now let's explore the Family Directory. This module helps you coordinate info for immediate and extended family members. At the top, a segmented tab controller lets us filter between immediate relations, extended family, or the entire directory.
> 
> Adding a new member is incredibly fast using the inline composer. We just type the name, select the relationship from our modal list, set their date of birth, and add their phone number. Tapping the add button inserts them directly into the feed. 
> 
> Expanding a card reveals additional metadata. Notice this bell icon—this toggles automatic birthday reminders. When enabled, MyLife dynamically schedules local system notifications 1 day prior at 9:00 AM, using the native notification manager so you never forget a special day."

---

### Section 5: Shopping Lists & Partner Sync
**Timing:** `05:00 - 06:15` (1 min 15 sec)  
**Visual Focus:** Navigate to `/shopping`.
* **Visual Actions:**
  1. Highlight the header stats card showing "Urgent" vs "Monthly" item counts.
  2. Tap the **Quick Add Item** panel. Type *"Milk"* and watch the category automatically switch to *"Groceries"*.
  3. Tap the **Bulk Add** panel. Type *"Bread, Detergent, Aspirin"* and show how the live preview parser automatically groups them into Groceries, Household, and Medicine. Click submit to add them.
  4. Expand an item's card and toggle the **Shared** switch.
  5. Check a checkbox to mark an item as bought, showing it moving to the History tab.

> **Narrator:**
> "Next up is the Shopping module. This module separates lists into Today's Urgent Items and Monthly Essentials. It features a smart, real-time keyword categorizer. Watch this: when I type 'Milk', the app automatically categorizes it under 'Groceries'. If I type 'Aspirin', it matches 'Medicine'. 
> 
> For large grocery runs, we have a Bulk Add feature. You can paste a comma-separated list like 'Bread, Detergent, Aspirin', and the app parses and categorizes them instantly. 
> 
> You can toggle the 'Shared' flag on any item. This syncs the item with your spouse's account in real-time. Once bought, checking the item triggers a smooth transition, moving it to the History tab with a detailed timestamp of the purchase."

---

### Section 6: Health Centre
**Timing:** `06:15 - 07:45` (1 min 30 sec)  
**Visual Focus:** Navigate to `/health`.
* **Visual Actions:**
  1. Highlight the **Wellness Avatar** (animated ring representing daily compliance score).
  2. Tap the **Drink Water** button (increases score and progress bar).
  3. Tap **Log Sleep** and log 8 hours.
  4. Under the medicine list, toggle a medicine as taken. Watch the score card recalculate.
  5. Click the **Timeline** tab, showing logged entries chronologically.
  6. Click the **Cycle** tab (visible if gender is Female) to show the period calendar and predictions.

> **Narrator:**
> "The Health Centre is a gamified, premium wellness companion that replaces dry medical log sheets. The screen revolves around this animated wellness avatar and a dynamic wellness score out of 100.
> 
> This score is calculated in real-time based on four key metrics: water intake, sleep duration, medicine compliance, and mood tracking. Tapping the water button logs 250 milliliters, and logging our sleep hours immediately updates the progress rings. You can check off scheduled daily medicines directly from this quick-action list.
> 
> The screen features three other tabs: the Timeline tab, which displays a chronological feed of all health logs; the Calendar tab, providing a monthly summary; and the Cycle tab. The Cycle tab features a tap-to-log calendar that tracks menstrual cycles and predicts future periods and fertility windows using soft pink calendar highlights."

---

### Section 7: To-Do Checklist
**Timing:** `07:45 - 09:00` (1 min 15 sec)  
**Visual Focus:** Navigate to `/todo`.
* **Visual Actions:**
  1. Look at the segmented tabs: **Pending**, **Completed**, and **All**.
  2. Use the inline composer to add a task, selecting "High" priority and category "Work".
  3. Expand the newly created task card.
  4. Type a subtask name in the subtask field and click the plus button to add it.
  5. Check off one subtask and point to the progress bar filling up.

> **Narrator:**
> "Let's move on to the To-Do Checklist. Designed to handle both simple tasks and complex work, this module helps you organize tasks with custom priorities, categories, and due dates.
> 
> Using the inline composer, we can add a task, set its priority, and choose a category. Expanding a task reveals a powerful subtasks manager. Here, we can break a large task down into actionable steps. 
> 
> As we check off each subtask, notice this progress bar filling up. This offers immediate visual feedback on your task completion rate. You can also specify custom recurrence options, like daily or weekly reminders, and share individual tasks with your linked partner."

---

### Section 8: Utility Tracker
**Timing:** `09:00 - 10:15` (1 min 15 sec)  
**Visual Focus:** Navigate to `/utility`.
* **Visual Actions:**
  1. Highlight the header stats showing Overdue, Unpaid, and Settled bills.
  2. Point out the color stripes: red for overdue, amber for due soon, green for settled.
  3. Add a water bill using the inline composer (Name, Amount, Due Date).
  4. Toggle the payment status by checking the checkbox, showing it change groups.

> **Narrator:**
> "The Utility Tracker is designed to ensure you never face late fees again. It handles everything from electricity and water to internet and rent. The bills are organized into three clear sections based on urgency: Overdue, highlighted with a red stripe; Due Soon, marked in amber; and Settled History, in green.
> 
> Quick adding a utility bill takes only a second. You specify the name, amount, and due date. 
> 
> Behind the scenes, MyLife monitors these bills. If a bill is unpaid, it automatically schedules a local system reminder three days before the due date at 9:00 AM. Tapping the checkbox marks a bill as paid, moving it instantly into your history log and canceling any pending reminders."

---

### Section 9: Finance Dashboard
**Timing:** `10:15 - 11:30` (1 min 15 sec)  
**Visual Focus:** Navigate to `/finance`.
* **Visual Actions:**
  1. Highlight the **Net Balance Card** showing balance, monthly income, expenses, and trend percentages.
  2. Highlight the **Budget Alert Banner** (caution/warning if expenses are near income limits).
  3. Click **Add Expense** to open the inline transaction composer.
  4. Type an amount (e.g., 500), pick category "Food", and type notes "Weekly groceries".
  5. Click Save to show the ledger updating.

> **Narrator:**
> "The Finance module provides a premium expense and income ledger. The top card shows your current net balance, total income, total expenses, and the percentage trend comparison from the previous period.
> 
> If your monthly spending exceeds safe limits, a smart budget alert banner dynamically appears, warning you of high spending relative to your income.
> 
> Adding a transaction is very straightforward. Clicking 'Add Expense' opens our inline panel. We can input the amount, select from our categorized icons—like Food, transport, or bills—and add notes. Saving updates the dashboard instantly and recalculates your balance and compliance limits."

---

### Section 10: Events & Voice NLP
**Timing:** `11:30 - 12:30` (1 min)  
**Visual Focus:** Navigate to `/future-event`.
* **Visual Actions:**
  1. Show the events list with countdown timers.
  2. Tap the **Voice Event Planner** panel.
  3. In the input box, type or dictate: *"Wedding anniversary next Friday in Colombo at 6:00 PM"*.
  4. Show the live voice preview parser displaying: Title: "Wedding anniversary", Type: "Anniversary", Date: (next Friday's date), Time: "06:00 PM", Location: "Colombo", Confidence: "High".
  5. Tap **Confirm Event** to add it to the feed.

> **Narrator:**
> "The Future Events planner lets you track and countdown to life's milestones. But the crowning jewel of this module is our advanced natural language processing voice parser.
> 
> Tapping the Voice panel, we can dictate or type a phrase in plain English. For example, if I say, 'Wedding anniversary next Friday in Colombo at 6:00 PM', the app's NLP engine breaks this down in real-time. It accurately extracts the title, sets the event type to Anniversary, calculates the correct date for next Friday, detects the time, and logs the location, showing a high confidence score. 
> 
> With one tap, we confirm the details, and the event is added to our list, complete with active countdowns and partner reminders."

---

### Section 11: Spouse Sync & Outro
**Timing:** `12:30 - 13:00` (30 sec)  
**Visual Focus:** Go to **Settings** screen (`/settings`).
* **Visual Actions:**
  1. Highlight the **Data Sharing** card showing the linked partner's email.
  2. Point to the shared indicators: Shopping, Events, To-Do, and Utility.
  3. Close the settings screen and show the home dashboard again.
  4. Fade out or close presentation.

> **Narrator:**
> "Lastly, let's look at spouse synchronization. Under Settings, you can link your account with your partner's email address. Once linked, any items you flag as 'Shared' in the Shopping, Events, To-Do, and Utility modules are instantly synchronized across both devices. This makes coordinating chores, bills, and calendars completely frictionless.
> 
> MyLife is more than just an organizer—it's a shared digital home. Thank you for watching, and start organizing your life today!"

---

## 💡 Pro-Tips for Recording the Video

1. **Pacing:** Keep a steady, conversational pace. If you run ahead of the timings, spend an extra 5 seconds interacting with the screen elements (e.g., expanding cards, toggling checkboxes, or switching tabs).
2. **Data Preparation:** Before recording, pre-populate your backend database with some sample data (e.g., 2-3 tasks, 2 utility bills, 3 family members, and a few finance transactions). This makes the dashboard look rich and alive from the very first frame.
3. **Simulating Voice Input:** If you are recording on an emulator where microphone access is limited, type out the sentence *"Wedding anniversary next Friday in Colombo at 6:00 PM"* in the voice text field. The NLP parser behaves exactly the same way, making for a smooth demo.
4. **Highlights:** Keep the focus on the **Health Companion** (avatar and compliance score) and the **NLP Voice Planner**, as these are the most interactive and visually impressive features in the app.
