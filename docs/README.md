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

### Planned 📋
- Contact Tags and Grouping
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
- Modern web browser (Chrome, Firefox, Edge)

### Quick Start
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
- [ ] Contact tags and grouping
- [ ] Calendar integration

## Documentation

- [Documentation Standards](DOCUMENTATION_STANDARD.md)
- [Core Requirements](product/core-requirements.md)
- [Future Enhancements](roadmap/future-enhancements.md)
- [Known Issues](operations/known-issues.md)
- [Session Tracking](operations/session_tracking.md)
