# AICRM - Customer Relationship Management

AICRM is a AI First browser-based Customer Relationship Management (CRM) application that helps businesses manage their relationships with customers, leads, and prospects. All development should consider how AI inclusion can benefit the product
## Features

### Implemented ✅
- **Dashboard** — Overview with key metrics (total contacts, leads, activities, won deals, pipeline value, won revenue, average deal size)
- **Contacts Management** — Add, edit, delete, search, and filter contacts by status
- **Leads Pipeline** — Track leads through stages (New → Contacted → Qualified → Proposal → Won/Lost)
- **Lead Scoring** — Automatic lead scoring based on source, stage, value, and engagement (Cold/Warm/Hot/Critical tiers)
- **Activities Tracking** — Log calls, emails, meetings, notes, and tasks linked to contacts
- **Email Templates** — Create, edit, and manage reusable email templates with variable substitution and category filtering
- **CSV Import/Export (Contacts)** — Import and export contact data via CSV files
- **CSV Import/Export (Leads)** — Import and export lead data via CSV files (with stage/source validation)
- **Dashboard Revenue Summary** — Pipeline value, won revenue, average deal size, and per-stage revenue breakdown
- **Dark/Light Theme** — Toggle between light and dark themes
- **Global Search** — Search across contacts, leads, and activities
- **AI-Powered Lead Recommendations** — Dashboard card showing prioritized lead recommendations with scoring, urgency indicators (stale lead detection), and click-to-navigate
- **Keyboard Shortcuts** — Full keyboard navigation: number keys (1-5) for page navigation, `/` to focus search, `?` for shortcuts help, `Ctrl+N` for new contact, `Ctrl+L` for new lead, `Ctrl+E` for export, `Escape` to close modals
- **Data Backup and Restore** — Create timestamped JSON backup files with metadata (app name, version, data summary), restore with Replace (overwrite all) or Merge (add new, keep existing) modes, and track last backup timestamp
- **Activity Due Date Tracking** — Optional due dates on activities, overdue highlighting with red indicators, overdue count badge on navigation, dashboard overdue stat card, status filtering (All/Overdue/Completed/Active), mark complete functionality, and overdue sorting
- **Contact Activity Quick-Add FAB** — Floating action button for one-tap activity creation with pre-filled type chips (Call, Email, Meeting, Note, Task), keyboard shortcut `Q` to toggle, and auto-collapse on outside click
- **Dashboard Recent Items** — "Recent Contacts" and "Recent Leads" cards on the dashboard showing the 5 most recently modified items from each entity, with timestamps, "View All" navigation links, empty state messaging, and dark theme support
- **Contact Tags** — Create, edit, and delete color-coded tags via Manage Tags modal; assign multiple tags to contacts through checkbox selector in contact edit form; tag badges rendered on contact cards; tags persist via backend API and pre-select on re-edit
- **Bulk Contact Operations** — Select multiple contacts via checkboxes for batch operations: bulk delete, bulk status update (Active/Inactive/VIP), and bulk tag assignment. Bulk action bar shows selection count, supports select-all/select-none, and integrates with existing tag management.
- **Quick Activity Logging from Contact Cards** — One-click activity logging buttons (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note) directly on each contact card. Opens activity modal with type pre-filled and contact auto-selected, enabling rapid activity creation without navigating away from the list view.
- **Activity Reminders and Notifications** — Browser-based notification system for upcoming and overdue activities. Configurable reminder settings (enable/disable, daily reminder time, advance notice 0-3 days, overdue notifications). Supports both in-app toast notifications (click-to-navigate) and native browser notifications. Periodic background checker (every 5 minutes) scans for due/overdue activities and alerts the user. Settings persist via backend.
- **Sales Pipeline Kanban Board View** — Visual Kanban board for leads with 6 stage columns (New, Contacted, Qualified, Proposal, Won, Lost), HTML5 drag-and-drop to move leads between stages, stage-specific PATCH API endpoint, column headers showing lead count and total pipeline value, per-card stage selector dropdown, lead scoring badges, days-in-stage aging indicators, and keyboard shortcut `K` to toggle between grid and Kanban views.
- **Dashboard PDF Report Export** — One-click "Export PDF Report" button on the dashboard that generates a clean, shareable one-page PDF of all dashboard metrics (stat cards, pipeline breakdown, recent activities, revenue summary) using native browser `window.print()` with dedicated `@media print` CSS. No external dependencies required.

### Planned 📋
- Calendar Integration

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+) — thin SPA client
- **Backend**: FastAPI (Python) — REST API for all business domains
- **Database**: PostgreSQL — system of record for Contacts, Templates, Leads, Activities, Settings, and audit log
- **Authentication**: JWT (development shared token or production JWKS)
- **Session state**: Browser `sessionStorage` — transient auth token only; no business data stored client-side
- **Testing**: Playwright (E2E)
- **Package Manager**: npm (devDependencies only: markdownlint, playwright)

## Setup and Installation

### Prerequisites
- Python 3.11+ (for FastAPI backend)
- PostgreSQL 14+ (database)
- Node.js (for testing with Playwright, optional)
- Docker and Docker Compose (for containerized deployment)
- Modern web browser (Chrome, Firefox, Edge)

### Docker Compose (Recommended)

The application runs as a Docker Compose stack with three services:

| Service | Container Name | Image | Host Port | Internal Port |
|---------|---------------|-------|-----------|---------------|
| Database | `aicrm-db` | postgres:15-alpine | 5432 | 5432 |
| Backend | `aicrm-backend` | python:3.11-slim (custom) | 9000 | 9000 |
| Frontend | `aicrm-frontend` | nginx:1.25-alpine (custom) | 8080 | 80 |

```bash
# Start the full stack
docker compose up -d

# Check container health
docker compose ps

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop the stack
docker compose down
```

### ⚠️ CRITICAL: Docker Volume Mount Limitation

**Both the frontend and backend containers use `COPY` in their Dockerfiles — there are NO volume mounts for source code.** This means:

- Editing files in `app/` on the host does NOT affect the running frontend container.
- Editing files in `backend/` on the host does NOT affect the running backend container.

**To apply code changes to running containers, you MUST use one of these approaches:**

#### Option A: `docker cp` (Fast — for iterative development)

Copy individual files into the running container:

```bash
# Frontend changes (nginx serves from /usr/share/nginx/html/)
docker cp app/index.html aicrm-frontend:/usr/share/nginx/html/app/index.html
docker cp app/js/app.js aicrm-frontend:/usr/share/nginx/html/app/js/app.js
docker cp app/css/styles.css aicrm-frontend:/usr/share/nginx/html/app/css/styles.css

# Backend changes (app lives at /app/)
docker cp backend/app/main.py aicrm-backend:/app/app/main.py
```

#### Option B: Rebuild containers (Thorough — for major changes)

Rebuild and restart the affected service(s):

```bash
# Rebuild frontend only
docker compose up -d --build frontend

# Rebuild backend only
docker compose up -d --build backend

# Rebuild everything
docker compose up -d --build
```

### Quick Start (Native — no Docker)
```bash
# 1. Start PostgreSQL (if not already running)

# 2. Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/aicrm"
export AUTH_MODE="development"
export AUTH_DEV_TOKEN="your-dev-token"

# 3. Start the backend (auto-creates tables on first run)
cd backend
uvicorn main:app --reload --port 8000

# 4. In another terminal, serve the frontend
cd ..
python3 -m http.server 8080

# 5. Open in browser
open http://localhost:8080/app/index.html
```

### Running Tests
```bash
# Install Playwright (one-time setup)
npm install playwright

# Run all core verification tests
node docs/testing/verify-core-features.js

# Run CSV import/export tests
node docs/testing/test-csv-import-export.js

# Run lead scoring tests
node docs/testing/test-lead-scoring.js

# Run revenue summary tests
node docs/testing/test-revenue-summary.js

# Run lead CSV import/export tests
node docs/testing/test-lead-csv.js

# Run email templates tests
node docs/testing/test-email-templates.js

# Run AI recommendations tests
node docs/testing/test-ai-recommendations.js

# Run keyboard shortcuts tests
node docs/testing/test-keyboard-shortcuts.js

# Run backup and restore tests
node docs/testing/test-backup-restore.js

# Run activity due date tracking tests
node docs/testing/test-activity-due-date-tracking.js

# Run quick activity logging tests
node docs/testing/test-quick-activity-logging.js

# Run activity reminders and notifications tests
node docs/testing/test-activity-reminders.js
```

## Architecture

```
AICRM/
├── app/
│   ├── index.html          # Main application shell
│   ├── css/
│   │   └── styles.css      # All styles (light + dark themes)
│   └── js/
│       ├── app.js          # Application logic (routing, CRUD, scoring)
│       ├── api.js          # API client (HTTP layer, auth token handling)
│       ├── auth.js         # Auth state management (sessionStorage)
│       ├── config.js       # Configuration (API base URL)
│       ├── version.js      # Version info
│       ├── contacts-data-source.js
│       ├── templates-data-source.js
│       ├── leads-data-source.js
│       ├── activities-data-source.js
│       └── settings-data-source.js
├── backend/
│   ├── main.py             # FastAPI application entry point
│   ├── api/                # Route modules
│   ├── models/             # Pydantic models
│   ├── repositories/       # PostgreSQL repository layer
│   ├── services/           # Business logic services
│   ├── security/           # Auth, RBAC, audit
│   └── database.py         # Database connection and migration
└── docs/
```

### Data Model

All business data is stored in PostgreSQL. The frontend accesses data exclusively through the backend REST API.

| Entity | Table | Key Fields |
|--------|-------|------------|
| Contacts | `contacts` | id, name, email, phone, company, status, notes, created_at, updated_at |
| Leads | `leads` | id, name, company, email, phone, value, stage, source, notes, created_at, updated_at |
| Activities | `activities` | id, type, description, contact_id, contact_name, date, due_date, status, created_at, updated_at |
| Templates | `templates` | id, name, category, subject, body, created_at, updated_at |
| Settings | `settings` | key, value, updated_at |
| Audit Log | `audit_log` | id, entity_type, entity_id, action, actor_subject, actor_username, actor_email, actor_roles, details, created_at |

### Revenue Calculations

Dashboard revenue stats are calculated dynamically from leads data:

| Metric | Calculation |
|--------|-------------|
| **Total Pipeline Value** | Sum of `value` for leads where stage ≠ "lost" and ≠ "won" |
| **Won Revenue** | Sum of `value` for leads where stage = "won" |
| **Average Deal Size** | Won Revenue / count of won leads (or $0.00 if none) |
| **Per-Stage Revenue** | Sum of `value` for leads at each pipeline stage |

Revenue values are formatted using `Intl.NumberFormat` with USD locale and displayed with a green left border on stat cards.

### Lead Scoring Algorithm

Leads are automatically scored (0–100) based on:

| Factor | Criteria | Points |
|--------|----------|--------|
| **Source** | Website | +5 |
| | Referral | +15 |
| | Social Media | +10 |
| | Cold Call | +5 |
| | Event | +10 |
| **Stage** | New | +0 |
| | Contacted | +10 |
| | Qualified | +25 |
| | Proposal | +40 |
| | Won | +50 |
| **Value** | $0–$10K | +5 |
| | $10K–$50K | +15 |
| | $50K–$100K | +25 |
| | $100K+ | +35 |
| **Engagement** | Has email | +5 |
| | Has phone | +5 |
| | Has company | +10 |
| | Has notes | +5 |

**Score Tiers:** Cold (0–24), Warm (25–44), Hot (45–69), Critical (70–100)

### Lead CSV Export/Import

Leads can be exported to and imported from CSV files. The CSV format includes:

| Column | Description |
|--------|-------------|
| Name | Lead/company name |
| Company | Company name |
| Email | Contact email |
| Phone | Contact phone |
| Value | Deal value (numeric) |
| Stage | Pipeline stage (new, contacted, qualified, proposal, won, lost) |
| Source | Lead source (website, referral, social media, cold call, event) |
| Notes | Additional notes |

**Import Validation:**
- Invalid stages default to "new"
- Invalid sources are cleared
- Rows without a name are skipped
- Dashboard stats are updated after import

### AI-Powered Lead Recommendations

The dashboard displays a "Recommended Actions" card that analyzes active leads and surfaces the most actionable opportunities. The algorithm:

1. **Filters** — Only active leads (excludes "won" and "lost" stages) are considered
2. **Scores** — Each lead is scored using the existing lead scoring algorithm (0–100)
3. **Detects Staleness** — Leads without activity for 14+ days are marked urgent; 7–13 days are high priority
4. **Generates Suggestions** — Context-aware suggestions based on lead stage:
   - `new` → "Initial outreach recommended"
   - `contacted` → "Follow up to advance the conversation"
   - `qualified` → "Prepare proposal or presentation"
   - `proposal` → "Close the deal — negotiate and finalize"
5. **Ranks** — Results are sorted by score (highest first), with stale leads boosted
6. **Limits** — Maximum 3 recommendations displayed

**Urgency Tiers:**
| Days Since Creation | Urgency Class | Border Color |
|---------------------|---------------|--------------|
| 14+ days | `recommendation-urgent` | Red (danger) |
| 7–13 days | `recommendation-high` | Orange (warning) |
| < 7 days | `recommendation-normal` | Blue (accent) |

**Files Modified:**
- `app/index.html` — Recommended Actions card HTML
- `app/js/app.js` — `renderRecommendedActions()` method, called from `renderDashboard()`
- `app/css/styles.css` — Recommendation card and item styles
- `docs/testing/test-ai-recommendations.js` — 9-test Playwright suite

### Keyboard Shortcuts

Full keyboard navigation for power users. A keyboard icon button in the header opens a shortcuts help modal.

**Available Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `1-5` | Navigate to Dashboard, Contacts, Leads, Activities, Templates |
| `/` | Focus global search bar |
| `?` | Open keyboard shortcuts help |
| `Ctrl+N` | Open new contact modal |
| `Ctrl+L` | Open new lead modal |
| `Ctrl+E` | Export current page to CSV |
| `Escape` | Close modals |

Shortcuts are disabled while typing in input fields (except `/`, `?`, `Escape`).

**Files Modified:**
- `app/index.html` — Keyboard icon button in header, shortcuts modal HTML
- `app/js/app.js` — `bindKeyboardShortcuts()` method, global keydown listener
- `app/css/styles.css` — Modal and key badge styles
- `docs/testing/test-keyboard-shortcuts.js` — 11-test Playwright suite

### Data Backup and Restore

The frontend provides CSV import/export for Contacts and Leads as a client-side convenience feature. This is **not** a full application backup — it only exports the currently visible domain data and does not include audit logs, settings, or relational integrity. Full data backup and recovery should be handled at the PostgreSQL level (e.g. `pg_dump`).

### Activity Due Date Tracking

Activities support optional due dates with overdue detection, visual indicators, and status tracking.

**Features:**
- **Due Date Field** — Optional date input on activity creation/edit forms
- **Overdue Detection** — Activities past their due date (and not completed) are flagged as overdue
- **Visual Indicators** — Overdue activities have red left border, red timeline dot, and ⚠️ warning icon on the due date
- **Overdue Sorting** — Overdue activities automatically sort to the top of the timeline
- **Navigation Badge** — Red badge on Activities nav item showing overdue count (hidden when 0)
- **Dashboard Stat** — "Overdue Activities" stat card on the dashboard
- **Status Filter** — Dropdown with options: All, Overdue, Completed, Active
- **Mark Complete** — ✅ button on each activity card; completed activities get strikethrough text and reduced opacity
- **Status Field** — Activities use `status` field ("active" or "completed") for unified completion tracking

**Overdue Calculation:**
An activity is overdue when: `dueDate` is set AND `dueDate < today` AND `status !== "completed"`

**Files Modified:**
- `app/index.html` — Due date input in activity form, status filter dropdown, overdue badge on nav, overdue stat on dashboard
- `app/js/app.js` — `getOverdueCount()`, `markActivityComplete()`, `updateOverdueBadge()`, `renderActivities()` (sorting, filtering, overdue styling)
- `app/css/styles.css` — `.activity-card.overdue`, `.due-date-overdue`, `.due-date-future`, `.nav-badge`, completed activity styles
- `docs/testing/test-activity-due-date-tracking.js` — 15-test Playwright suite

### Contact Activity Quick-Add FAB

A floating action button (FAB) provides instant access to activity creation from any page, with one-tap type selection.

**Features:**
- **Floating Button** — Fixed position button in bottom-right corner with "+" icon
- **Activity Type Chips** — Expandable menu with 5 pre-configured activity types: Call, Email, Meeting, Note, Task
- **One-Tap Creation** — Click any chip to open the activity modal with that type pre-selected
- **Keyboard Shortcut** — Press `Q` to toggle FAB expansion
- **Auto-Collapse** — FAB collapses when clicking outside or pressing `Escape`
- **Visual Feedback** — Button rotates from "+" to "×" when expanded, with smooth CSS transitions
- **Dark Theme Support** — FAB adapts to dark/light theme automatically

**Implementation:**
- FAB HTML added to `app/index.html` with button and chip container
- `bindFAB()` method in `app/js/app.js` handles click events, chip selection, and outside-click detection
- `toggleFAB()` method manages expand/collapse state and button rotation
- CSS transitions for smooth chip reveal and button rotation
- Keyboard shortcut `Q` integrated into existing `bindKeyboardShortcuts()` method
- Shortcuts help modal updated with FAB entry

**Files Modified:**
- `app/index.html` — FAB button and chips HTML
- `app/js/app.js` — `bindFAB()`, `toggleFAB()` methods, keyboard shortcut integration
- `app/css/styles.css` — FAB button, chips, transitions, and dark theme styles

### Bulk Contact Operations

Multi-select contacts for batch operations, enabling efficient management of large contact lists.

**Features:**
- **Multi-Select Checkboxes** — Each contact card displays a checkbox; select individual contacts or use "Select All"
- **Bulk Action Bar** — Floating action bar appears when contacts are selected, showing selection count
- **Bulk Delete** — Delete all selected contacts in a single operation with confirmation dialog
- **Bulk Status Update** — Change status of all selected contacts to Active, Inactive, or VIP
- **Bulk Tag Assignment** — Assign existing tags to all selected contacts simultaneously
- **Select All / Select None** — Quick toggles in the bulk action bar
- **Visual Feedback** — Selected contacts are highlighted; action bar shows real-time count

**Implementation:**
- Bulk operation checkboxes added to contact cards in `app/index.html`
- `bindBulkOperations()` method in `app/js/app.js` manages selection state, event delegation, and bulk action bar visibility
- `updateBulkActionBar()` updates the floating action bar with selection count and action buttons
- Backend bulk endpoints: `DELETE /api/contacts/bulk`, `PATCH /api/contacts/bulk/status`, `PATCH /api/contacts/bulk/tags`
- Bulk operations are atomic — all succeed or all fail with rollback

**Files Modified:**
- `app/index.html` — Bulk action bar HTML, contact card checkboxes
- `app/js/app.js` — `bindBulkOperations()`, `updateBulkActionBar()`, bulk action handlers
- `app/css/styles.css` — `.bulk-action-bar`, `.contact-checkbox`, selection highlight styles
- `backend/app/api/contacts.py` — Bulk delete, status update, and tag assignment endpoints

### Quick Activity Logging from Contact Cards

One-click activity logging buttons directly on contact cards enable rapid activity creation without navigating away from the list view.

**Features:**
- **Quick-Action Buttons** — Each contact card displays 4 icon buttons: 📞 Call, 📧 Email, 🤝 Meeting, 📝 Note
- **Pre-filled Activity Modal** — Clicking a button opens the activity modal with the type pre-selected and contact name auto-filled
- **Rapid Workflow** — Users can create activities directly from the contacts list without context switching
- **Dark Theme Support** — Buttons adapt to dark/light theme with appropriate colors and hover states

**Implementation:**
- Quick action buttons rendered as part of the contact card template in `app/js/app.js`
- Inline `onclick` handlers call `showActivityModal()` with pre-filled type and contact name
- CSS styles for `.card-quick-actions` provide button row layout, hover states, and dark theme support

**Files Modified:**
- `app/js/app.js` — Contact card template includes quick action buttons
- `app/css/styles.css` — `.card-quick-actions` styles with responsive layout
- `docs/testing/test-quick-activity-logging.js` — 9-test Playwright E2E suite

### Activity Reminders and Notifications

Browser-based notification system that alerts users about upcoming and overdue activities through both in-app toast notifications and native browser notifications.

**Features:**
- **Reminder Settings** — Configurable via Settings page: enable/disable, daily reminder time, advance notice (0-3 days before due date), and overdue notification toggle
- **In-App Notifications** — Enhanced toast notifications for activities due today and overdue activities, with click-to-navigate to Activities page
- **Browser Notifications** — Native browser notifications (via Notification API) when permission is granted, with permission status display
- **Test Notification** — One-click test button to request notification permission and verify the system works
- **Periodic Checker** — Background interval (every 5 minutes) that scans all activities for upcoming/overdue items
- **Auto-Start** — If reminders were previously enabled, the checker auto-starts on app load
- **Settings Persistence** — All reminder settings persist via backend Settings API
- **Dark Theme Support** — Reminder settings card and notification styles adapt to dark/light theme

**Implementation:**
- New settings card in `app/index.html` with form controls for all reminder options
- `bindReminders()`, `loadReminderSettings()`, `saveReminderSettings()` methods in `app/js/app.js` for settings management
- `testNotification()` and `_showBrowserNotification()` for browser notification integration
- `_startReminderChecker()`, `_stopReminderChecker()`, `_checkReminders()` for the periodic background scan
- `_showInAppReminder()` for enhanced in-app toast notifications with click-to-navigate
- `_autoStartReminders()` called during app initialization to restore previous reminder state
- CSS styles for `.reminder-status`, `.reminder-notification`, `.reminder-badge`, and form controls

**Files Modified:**
- `app/index.html` — Reminder settings card with form controls, save/test buttons, and permission display
- `app/js/app.js` — Reminder settings management, browser notifications, periodic checker, in-app reminders
- `app/css/styles.css` — Styles for reminder settings UI, notification toasts, and dark theme support
- `docs/testing/test-activity-reminders.js` — 15-test Playwright E2E suite

## Project Milestones

- [x] Project setup and core infrastructure
- [x] Contacts management (CRUD, search, filter)
- [x] Leads pipeline management
- [x] Activities tracking
- [x] CSV import/export
- [x] Lead scoring system
- [x] Dashboard revenue summary
- [x] Lead CSV import/export
- [x] Email templates (CRUD, categories, variables)
- [x] AI-Powered Lead Recommendations (dashboard card, scoring, urgency)
- [x] Keyboard Shortcuts (full keyboard navigation)
- [x] Data Backup and Restore (metadata, merge/replace modes, timestamp tracking)
- [x] Activity Due Date Tracking (overdue indicators, status filtering, badge, dashboard stat, completion tracking)
- [x] Contact Activity Quick-Add FAB (floating action button, pre-filled type chips, keyboard shortcut Q)
- [x] Contact tags (color-coded tags, manage tags modal, contact assignment, backend persistence)
- [x] Bulk contact operations (multi-select, bulk delete, bulk status update, bulk tag assignment)
- [x] Quick Activity Logging from Contact Cards (one-click call/email/meeting/note buttons on cards)
- [x] Activity Reminders and Notifications (browser notifications, in-app toasts, configurable reminder time/advance notice, settings persistence)
- [ ] Calendar integration

## Documentation

- [Documentation Standards](DOCUMENTATION_STANDARD.md)
- [Core Requirements](product/core-requirements.md)
- [Future Enhancements](roadmap/future-enhancements.md)
- [Known Issues](operations/known-issues.md)
- [Session Tracking](operations/session_tracking.md)
