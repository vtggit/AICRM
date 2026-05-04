# AICRM - Future Enhancements - Always consider AI inclusion in every enhancement

## Item 1: Contact Import/Export with CSV Support ✅ IMPLEMENTED
**Status:** Implemented (Session 2)
**Description:** Add ability to import contacts from CSV files and export contacts to CSV format. This would allow users to migrate data from spreadsheets or other CRM systems.
**Features:**
- ✅ CSV file upload with proper parsing (handles quoted fields, escaped quotes)
- ✅ Data validation during import (skips empty rows, reports counts)
- ✅ Export all contacts to CSV with headers (Name, Email, Phone, Company, Status, Notes)
- ✅ Toast notification system for success/error feedback
- ✅ Timestamped export filenames (contacts_YYYY-MM-DD.csv)
- ✅ Proper CSV escaping for special characters and commas
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-csv-import-export.js` (7/7 passed)

## Item 2: Lead Scoring System ✅ IMPLEMENTED
**Status:** Implemented (Session 2)
**Description:** Implement an automated lead scoring mechanism that assigns points based on lead attributes and interactions.
**Features:**
- ✅ Scoring rules based on source (website, referral, social media, cold call, event)
- ✅ Scoring based on stage (new, contacted, qualified, proposal, won)
- ✅ Scoring based on deal value tiers ($0–$10K, $10K–$50K, $50K–$100K, $100K+)
- ✅ Engagement scoring (has email, phone, company, notes)
- ✅ Visual score badges on lead cards (Cold/Warm/Hot/Critical) with color coding
- ✅ Score filter dropdown (All Scores, Critical 70+, Hot 45-69, Warm 25-44, Cold 0-24)
- ✅ Sort by highest score option
- ✅ Combined filtering (stage + score)
- ✅ Score tooltip showing exact score out of 100
- ✅ Dark theme support for score badges
**Scoring Algorithm:** Score = source(0-15) + stage(0-50) + value(0-35) + engagement(0-25), capped at 100
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-lead-scoring.js` (7/7 passed)

## Item 3: Email Templates ✅ IMPLEMENTED
**Status:** Implemented (Session 3)
**Description:** Create reusable email templates for common communications like follow-ups, proposals, and introductions.
**Features:**
- ✅ Full CRUD operations (create, read, update, delete templates)
- ✅ Variable substitution with clickable chips ({{contact_name}}, {{contact_email}}, {{contact_phone}}, {{contact_company}}, {{lead_name}}, {{lead_company}}, {{lead_value}})
- ✅ Template categories (follow-up, introduction, proposal, thank-you, meeting, other)
- ✅ Category filter dropdown
- ✅ Template cards showing name, category badge, subject, and body preview (with variables shown as [var])
- ✅ Body preview truncation (150 chars max)
- ✅ Success notifications on save/delete
- ✅ Dark theme support
**Implementation Details:**
- Templates stored in PostgreSQL `templates` table, accessed via backend API
- Each template has: id, name, category, subject, body, createdAt
- Variable chips are clickable spans that insert the variable at the cursor position in the textarea
- Preview text replaces `{{variable}}` patterns with `[var]` for readability
- Navigation includes dedicated Templates page with full CRUD UI
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`, `app/js/templates-data-source.js`
**Tests:** `docs/testing/test-email-templates.js` (10/10 passed)

## Item 4: Calendar Integration
**Status:** Planned
**Description:** Add calendar view for scheduling and viewing upcoming meetings, calls, and tasks.
**Features:**
- Monthly and weekly calendar views
- Activity scheduling with reminders
- Conflict detection
- Export to iCalendar format

## Item 5: Advanced Reporting Dashboard
**Status:** Planned
**Description:** Comprehensive analytics and reporting features for tracking CRM performance.
**Features:**
- Conversion rate tracking
- Revenue forecasting based on pipeline
- Activity trend charts
- Custom date range filtering

## Item 6: Tags and Custom Fields
**Status:** Planned
**Description:** Allow users to add custom tags and fields to contacts and leads for better organization.
**Features:**
- Multi-tag support with color coding
- Custom field creation (text, number, date, select)
- Filter by tags
- Tag-based grouping

## Item 7: Activity Reminders and Notifications
**Status:** Planned
**Description:** Browser-based notifications for upcoming activities and follow-up reminders.
**Features:**
- Configurable reminder times
- Browser notification API integration
- Overdue activity alerts
- Daily digest of upcoming tasks

## Item 8: Multi-User Support
**Status:** Planned
**Description:** Support for multiple user accounts with role-based access control.
**Features:**
- User registration and authentication
- Role-based permissions (admin, manager, sales)
- Activity ownership tracking
- Shared contact management

## Item 9: Bulk Contact Operations
**Status:** Planned
**Description:** Enable mass operations on multiple contacts simultaneously to improve productivity for power users managing large contact lists.
**Features:**
- Multi-select contacts with checkboxes
- Bulk status change (e.g., mark multiple contacts as VIP or Inactive)
- Bulk delete with confirmation dialog
- Bulk tag assignment (when tags feature is implemented)
- "Select all" and "Select none" quick actions
**Implementation Approach:**
- Add checkbox column to contact cards/table view
- Floating action bar appears when contacts are selected
- Operations execute via backend API with batch endpoints for efficiency
- Toast notification showing count of affected records
**Dependencies:** Contact Management (Item 0 - existing)

## Item 10: Contact Activity History Timeline
**Status:** Planned
**Description:** Display a per-contact timeline of all related activities, providing a complete interaction history at a glance when viewing a contact's details.
**Features:**
- Expandable activity timeline within contact detail modal
- Chronological display of all activities linked to the contact
- Activity type icons for quick visual scanning
- Inline activity creation from the contact detail view
- Activity count badge on contact cards
**Implementation Approach:**
- Filter activities by contact ID when rendering contact modal
- Render timeline as a vertical list with connecting line and type icons
- Reuse existing activity creation form with pre-filled contact reference
- Add activity count to contact card footer
**Dependencies:** Contact Management, Activity Tracking (both Item 0 - existing)

## Item 11: Lead CSV Export/Import ✅ IMPLEMENTED
**Status:** Implemented (Session 2)
**Description:** Extend CSV import/export capability to leads, complementing the existing contact CSV feature. This allows users to migrate lead data from spreadsheets or other CRM systems.
**Features:**
- ✅ Export all leads to CSV with headers (Name, Company, Email, Phone, Value, Stage, Source, Notes)
- ✅ Import leads from CSV file with proper parsing (handles quoted fields, escaped quotes)
- ✅ Data validation during import (skips empty rows, reports counts)
- ✅ Toast notification for success/error feedback
- ✅ Timestamped export filenames (leads_YYYY-MM-DD.csv)
- ✅ Proper CSV escaping for special characters and commas
- ✅ Invalid stage values default to "new"
- ✅ Invalid source values are cleared
- ✅ Dashboard stats updated after import
**Files Modified:** `app/index.html`, `app/js/app.js`
**Tests:** `docs/testing/test-lead-csv.js` (8/8 passed)

## Item 12: Dashboard Revenue Summary ✅ IMPLEMENTED
**Status:** Implemented (Session 2)
**Description:** Add revenue-focused statistics to the dashboard, giving users immediate visibility into their pipeline value and won revenue.
**Features:**
- ✅ Total pipeline value stat card (sum of active lead values, excludes won/lost)
- ✅ Won revenue stat card (sum of all won lead values)
- ✅ Average deal size calculation (won revenue / won lead count)
- ✅ Revenue by pipeline stage breakdown in the pipeline overview
- ✅ Currency formatting using Intl.NumberFormat with USD locale
- ✅ Revenue cards styled with green left border
**Implementation Approach:**
- Added three new stat cards to the dashboard stats grid (Total Pipeline Value, Won Revenue, Average Deal Size)
- Extended pipeline overview to show value per stage alongside lead count
- Calculate totals from leads data dynamically on dashboard render
- Format values using `formatCurrency()` helper method
- Updated `renderDashboard()` to include revenue calculations
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-revenue-summary.js` (13/13 passed)
**Dependencies:** Lead Management (Item 0 - existing)

## Item 13: Quick Activity Logging from Cards
**Status:** Planned
**Description:** Add one-click activity logging buttons directly on contact and lead cards, allowing users to quickly log calls, emails, or meetings without navigating away from the list view.
**Features:**
- Quick-action buttons (Call, Email, Meeting) on each contact/lead card
- Mini activity form appears as an inline overlay or small modal
- Pre-fills the related contact/lead reference automatically
- Activity type defaults based on the button clicked
- Toast notification confirming the activity was logged
- Card briefly highlights to confirm the action
**Implementation Approach:**
- Add a "Quick Actions" row to contact and lead card footers with icon buttons
- Reuse `showActivityModal()` but pre-fill the contact name and activity type
- Add a CSS animation for card highlight on successful activity creation
- Wire up inline event handlers on the new buttons
**Dependencies:** Contact Management, Lead Management, Activity Tracking (all Item 0 - existing)

## Item 14: Dashboard Recent Items
**Status:** Planned
**Description:** Display recently added contacts and leads on the dashboard, giving users immediate visibility into their latest CRM activity without navigating to separate pages.
**Features:**
- "Recent Contacts" section showing the 5 most recently added contacts
- "Recent Leads" section showing the 5 most recently added leads
- Each item shows name, company/email, and creation timestamp
- Click item to navigate directly to its edit modal
- "View All" links to navigate to the full Contacts or Leads pages
- Sections collapse when no data exists
**Implementation Approach:**
- Add two new dashboard cards to the dashboard grid alongside "Recent Activities" and "Lead Pipeline"
- Use `Storage.get()` to fetch and sort contacts/leads by `createdAt` descending
- Render mini-card rows with name, email/company, and relative timestamp
- Add click handlers that trigger `editContact()` or `editLead()` modals
- Style as compact list items within dashboard-card containers
**Dependencies:** Contact Management, Lead Management (both Item 0 - existing)

## Item 15: AI-Powered Lead Recommendations
**Status:** Planned
**Description:** Use AI-driven insights to surface the most promising leads and suggest next-best actions, aligning with AICRM's "AI First" product vision. This helps sales teams prioritize their outreach efforts intelligently.
**Features:**
- "Recommended Actions" panel on dashboard showing top 3 leads needing attention
- Smart suggestions based on lead score, stage duration, and engagement history (e.g., "Follow up with Acme Corp — qualified for 14 days")
- Stale lead detection — flags leads that haven't been contacted in over 7 days
- Priority ranking combining lead score, deal value, and time since last activity
- Visual "Recommended" badge on high-priority lead cards
**Implementation Approach:**
- Create a `getLeadRecommendations()` method that scores leads by: (lead_score * 0.4) + (normalized_value * 0.3) + (engagement_recency * 0.3)
- Recency factor decreases over time since last linked activity (full points at day 0, zero after 14 days)
- Render a "Recommended Actions" dashboard card with clickable lead rows
- Add a `.recommended-badge` CSS class for highlighted leads
- Run recommendations dynamically on dashboard render (no extra storage needed)
**Dependencies:** Lead Scoring (Item 2 - implemented), Activity Tracking (Item 0 - existing)

## Item 16: Dashboard PDF Report Export
**Status:** Planned
**Description:** Generate a shareable one-page PDF summary of dashboard metrics, enabling users to include CRM data in meetings, reports, and stakeholder communications without screenshots.
**Features:**
- "Export PDF Report" button on the dashboard
- PDF includes: stat cards summary, pipeline breakdown, recent activities, and revenue summary
- Report header with AICRM branding, generation timestamp, and company name
- Clean, print-optimized layout with proper margins and page breaks
- Filename format: `aicrm_report_YYYY-MM-DD.pdf`
**Implementation Approach:**
- Use browser `window.print()` with a dedicated `@media print` CSS stylesheet
- Create a printable report layout that hides navigation, sidebar, and interactive elements
- Style the print view with clean typography, table borders, and proper section headers
- Add a hidden "Print Report" button that triggers `window.print()` and applies print CSS
- No external libraries needed — leverages native browser print-to-PDF capability
**Dependencies:** Dashboard (Item 0 - existing), Dashboard Revenue Summary (Item 12 - implemented)

## Item 17: Contact Duplicate Detection
**Status:** Planned
**Description:** Automatically detect potential duplicate contacts when creating or editing contacts, helping users maintain a clean and deduplicated contact database. This prevents accidental data fragmentation where the same person exists under multiple entries.
**Features:**
- Real-time duplicate check by email address during contact creation/editing
- Duplicate check by name + company combination
- Warning modal showing matching existing contacts with "Keep both" or "Merge" options
- Merge option combines notes from both records and keeps the older record's ID
- Visual duplicate indicator badge on contact cards when duplicates exist
- "Find Duplicates" button in Contacts toolbar to scan entire contact list
**Implementation Approach:**
- Add `findDuplicateContacts(name, email, company)` method that searches existing contacts by email exact match and fuzzy name+company match
- Hook into `saveContact()` to run duplicate check before saving new contacts
- Create a duplicate warning modal showing matched contacts with action buttons
- Implement `mergeContacts(id1, id2)` that combines notes, keeps activities, and removes the duplicate
- Add a `.duplicate-badge` CSS class for visual indicators on contact cards
- Add "Find Duplicates" button that filters and highlights all duplicate groups
**Dependencies:** Contact Management (Item 0 - existing)

## Item 18: Keyboard Shortcuts
**Status:** ✅ Implemented (Session 4)
**Description:** Add global keyboard shortcuts for power users to navigate and perform common actions faster without reaching for the mouse, improving productivity and accessibility.
**Features:**
- Global shortcut `/` to focus the search bar (works from any page)
- `Ctrl+N` or `Cmd+N` to open "New Contact" modal
- `Ctrl+L` or `Cmd+L` to open "New Lead" modal
- `1-5` to navigate to Dashboard, Contacts, Leads, Activities, Templates respectively
- `Escape` to close modals (already implemented)
- `Ctrl+E` to export current page data as CSV
- Visual shortcut hints displayed in a help modal (accessible via `?` key)
- Shortcuts disabled when user is actively typing in a text field
**Implementation Approach:**
- Added `bindKeyboardShortcuts()` method in `App.init()` with global `keydown` listener
- Check `e.target.tagName` to avoid triggering shortcuts during text input (except for `/`, `?`, `Escape`)
- Use `e.preventDefault()` to prevent default browser behavior for captured shortcuts
- Created "Keyboard Shortcuts" help modal showing all available shortcuts in organized sections
- Added keyboard icon in header that opens the shortcuts help modal
**Dependencies:** None — builds on existing navigation and modal system
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`, `docs/testing/test-keyboard-shortcuts.js`
**Tests:** 11/11 passing (button, modal, sections, `/` focus, keys 1-3 navigation, Ctrl+N, Ctrl+L, modal content, console errors)

## Item 19: Contact Import from vCard (vCard/VCF Support)
**Status:** Planned
**Description:** Enable importing contacts from vCard (.vcf) files, the universal contact exchange format used by email clients, smartphones, and most CRM systems. This complements the existing CSV import by supporting the most common personal contact export format.
**Features:**
- Upload .vcf files containing one or more vCard contacts (vCard 3.0 and 4.0 formats)
- Parse standard vCard fields: FN (full name), EMAIL, TEL, ORG (company), NOTE (notes)
- Map vCard fields to AICRM contact fields (name, email, phone, company, notes)
- Auto-detect and merge multi-value fields (multiple emails, multiple phones — use first value)
- Toast notification showing imported vs. skipped count
- Skip contacts that already exist (by exact email match) to prevent duplicates
- "Import vCard" button in Contacts toolbar alongside CSV buttons
**Implementation Approach:**
- Add `importContactsVCard()` method that reads .vcf files line-by-line
- Parse vCard BEGIN:VCARD/END:VCARD blocks, extracting FN, EMAIL, TEL, ORG, NOTE fields
- Handle folded lines (RFC 6715 continuation lines starting with space/tab)
- Create contact objects from parsed data and batch-save via Storage.set()
- Add file input for .vcf files and wire to new toolbar button
- Reuse existing `showNotification()` for feedback
**Dependencies:** Contact Management (Item 0 - existing), Contact CSV Import/Export (Item 1 - implemented)

## Item 20: Activity Due Date Tracking and Overdue Alerts
**Status:** Planned
**Description:** Add due date support for Tasks and Meetings activity types, with visual overdue indicators on the activities timeline and dashboard. This transforms the activity tracker from a passive log into an actionable task management system.
**Features:**
- Due date field for Task and Meeting activity types (date + optional time picker)
- Visual overdue indicator: red border and "Overdue" badge on past-due activities
- "Overdue" filter option in the Activities page filter dropdown
- Overdue count displayed on dashboard stat cards
- Sort activities by due date (soonest first) option
- Completed/checked state for tasks — toggle with a checkbox, visually strikethrough completed items
- Activities sorted by due date show overdue items at the top
**Implementation Approach:**
- Add `dueDate` and `completed` fields to activity data model (backend + PostgreSQL)
- Extend activity modal form with conditional date/time picker fields (shown only for Task and Meeting types)
- Add `isOverdue()` helper that compares dueDate with current timestamp
- Add overdue CSS styling (`.activity-item.overdue` with red left border and badge)
- Add "Overdue" option to `#activity-filter-type` dropdown and "Due Date (Soonest)" to sort dropdown
- Add overdue count to dashboard alongside today's activities stat
- Reuse existing activity CRUD infrastructure with extended fields
**Dependencies:** Activity Tracking (Item 0 - existing)

## Item 21: Quick Activity Log
**Status:** Planned
**Description:** A floating action button available on every page that lets users quickly log an activity (call, email, meeting, note, task) without navigating away from their current view. This reduces friction in activity tracking and encourages consistent logging by sales teams.
**Features:**
- Floating action button (FAB) visible on all pages (bottom-right corner)
- Clicking FAB opens a compact quick-log modal with pre-filled contact context (if viewing a contact/lead card)
- Activity type selector (icon buttons: call, email, meeting, note, task)
- Single-line description input with Enter-to-submit
- Auto-links activity to the currently viewed contact if applicable
- Success toast notification on save
- Keyboard shortcut `Q` to open quick log from any page
**Implementation Approach:**
- Add a fixed-position FAB button (`<button id="fab-quick-log" class="fab">`) to `index.html`
- Create `showQuickActivityModal(contactId)` that renders a minimal form in the modal system
- If user is on contacts page with a contact card expanded, pre-fill contactId
- Reuse `saveActivity()` from existing activity CRUD
- Add CSS for FAB (`.fab` class: fixed position, circular, shadow, hover scale)
- Add keyboard shortcut `Q` in global keydown listener
- Dark theme support for FAB
**Dependencies:** Activity Tracking (Item 0 - existing), Modal system (existing)

## Item 22: Dashboard Widget Customization
**Status:** Planned
**Description:** Allow users to customize their dashboard by toggling visibility of individual stat cards and sections, and reordering them via drag-and-drop. This personalizes the dashboard for different roles (e.g., sales reps vs. managers) and reduces clutter.
**Features:**
- Toggle switch on each stat card to show/hide it
- Drag-and-drop reordering of stat cards in the stats grid
- Toggle switches for dashboard sections (Recent Activities, Lead Pipeline, Recommended Actions)
- Layout preferences persisted in `settings` table via backend API
- "Reset Layout" button in settings to restore defaults
- Visual drag handle and drop indicators
**Implementation Approach:**
- Store layout config in `settings` table (key: `dashboard_layout`, value: JSON): `{ statCards: { visible: [...], order: [...] }, sections: { visible: [...] } }`
- Add toggle icons (eye/eye-off) to each stat card header
- Implement native HTML5 drag-and-drop API on stat cards (`draggable="true"`)
- Add CSS classes for drag states (`.dragging`, `.drop-target`)
- Create `loadDashboardLayout()` and `saveDashboardLayout()` methods
- Add "Reset Dashboard Layout" button to Settings page
- Default layout shows all cards in original order

## Item 23: Lead Assignment and Ownership
**Status:** Planned
**Description:** Allow leads to be assigned to specific team members (once multi-user support is implemented) or tracked with an "owner" label for solo users who manage multiple sales territories or accounts. This provides accountability and prevents leads from being orphaned.
**Features:**
- Owner field on lead creation/edit forms (free-text for solo users, dropdown for multi-user)
- Filter leads by owner
- Unassigned leads indicator on dashboard
- Assignment history tracking (who assigned what and when)
- "Claim" button for self-service lead assignment
- Visual owner badge on lead cards
**Implementation Approach:**
- Add `owner` field to lead data model (PostgreSQL `leads` table)
- Extend lead modal form with owner input field
- Add owner filter to the Leads page filter bar
- Add unassigned count to dashboard stats
- Create `assignLead(leadId, owner)` method in app.js
- Add `.owner-badge` CSS class for visual indicators on lead cards
**Dependencies:** Lead Pipeline (Item 0 - existing), Multi-User Support (Item 8 - planned, for dropdown selection)

## Item 24: Data Backup and Restore ✅ IMPLEMENTED (Client-Side Only)
**Status:** Implemented (Session 5) — Client-side convenience only; not a full system backup
**Description:** Provide users with a one-click way to export their CRM data as a single JSON file. This is a client-side convenience feature and **not** a substitute for PostgreSQL-level backups. Full data backup and recovery should be handled via `pg_dump` or equivalent database tools.
**Features:**
- ✅ "Create Backup" button in Settings page that downloads a JSON file containing accessible data (contacts, leads, activities, templates)
- ✅ Backup file includes timestamp and version metadata (appName, version, createdAt, summary with counts)
- ✅ Backup file naming convention: `aicrm_backup_YYYY-MM-DD.json`
- ✅ Success notifications with data counts after backup
**Implementation Approach:**
- Created `createBackup()` method that fetches domain data from backend APIs and serializes into a JSON file with metadata
- Backup is client-side convenience only — it does not include audit logs, settings, or relational integrity
- Full system backup should use PostgreSQL tools (`pg_dump`)
- Added `updateLastBackupDisplay()` called on init and after backup
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-backup-restore.js` (13/13 passed)
**Bug Fix:** Fixed settings object handling — `Storage.get()` returns `[]` by default for SETTINGS key; added guard to normalize to `{}` before reading/writing `lastBackup`

## Item 25: AI-Powered Email Composer
**Status:** Planned
**Description:** An intelligent email composition assistant that generates personalized email drafts by combining email templates with contact/lead context and AI-suggested content. This bridges the gap between static templates and fully manual email writing, helping sales teams send personalized outreach at scale.
**Features:**
- "Compose Email" button on contact and lead cards that opens the composer modal
- Select a template as the starting point (or start from blank)
- Auto-populate template variables with the selected contact/lead data
- AI suggestion panel with context-aware content recommendations:
  - Opening line suggestions based on contact status and last activity
  - Call-to-action suggestions based on lead stage
  - Follow-up timing recommendations based on activity history
- Preview mode showing the final email with all variables resolved
- "Send to Clipboard" button for easy paste into external email clients
- Save composed email as a new template option
**Implementation Approach:**
- Create `showEmailComposer(contactId, leadId)` method that renders a new modal
- Load selected template (if any) and resolve `{{variable}}` patterns with contact/lead data
- Build AI suggestion engine using rule-based patterns:
  - Analyze last activity date to suggest follow-up urgency
  - Use lead stage to determine appropriate CTAs
  - Use contact status (VIP, Active, Inactive) to adjust tone
- Render suggestions as clickable chips in a sidebar panel
- Add "Copy to Clipboard" using `navigator.clipboard.writeText()`
- Add CSS for the composer modal layout (split-pane: editor + suggestions)
- Dark theme support
**Dependencies:** Email Templates (Item 3 - implemented), Contact Management, Lead Management (existing)

## Item 26: Lead Conversion Funnel Analytics
**Status:** Planned
**Description:** A visual funnel chart on the dashboard showing lead conversion rates between each pipeline stage, with drop-off analysis. This gives users immediate insight into where leads are lost in the sales process and which stages need improvement.
**Features:**
- Funnel visualization on dashboard showing each pipeline stage as a narrowing bar
- Conversion rate percentage between consecutive stages (e.g., New → Contacted: 65%)
- Drop-off count and percentage at each stage transition
- Total leads and overall conversion rate (New → Won) displayed as summary metrics
- Hover tooltips on each stage showing: lead count, stage value, and average time in stage
- "Lost" stage shown as a separate parallel funnel branch with its own metrics
- Color-coded stages matching existing pipeline stage badges
- Responsive funnel that adapts to screen width
**Implementation Approach:**
- Create `renderConversionFunnel()` method that calculates stage transitions and conversion rates
- Build funnel as a series of div bars with decreasing widths proportional to lead count
- Calculate metrics: stage counts, inter-stage conversion rates, average time-in-stage
- Add CSS for `.funnel-container`, `.funnel-stage`, `.funnel-arrow`, and `.funnel-tooltip`
- Use existing stage color variables for visual consistency
- Add funnel card to dashboard between pipeline overview and recommended actions
- Dark theme support with adjusted contrast ratios
**Dependencies:** Lead Pipeline (existing), Lead Scoring (existing, for stage data)
## Item 27: Activity Due Date Tracking ✅ IMPLEMENTED
**Status:** Implemented (Session 6)
**Description:** Add due date and time support to activities, with visual overdue indicators and filtering. This transforms the activity tracker from a simple log into a proactive task management system, ensuring follow-ups are never missed.
**Features:**
- ✅ Due date picker on activity creation/edit forms
- ✅ Visual overdue indicator (red left border, red timeline dot, ⚠️ warning icon) for past-due activities
- ✅ "Overdue" filter option in activity status filter dropdown (All, Overdue, Completed, Active)
- ✅ Overdue count badge on the Activities nav item
- ✅ Overdue activities sorted to the top of the timeline
- ✅ "Mark Complete" quick action (✅ button) on each activity card
- ✅ Completed activities displayed with strikethrough text and reduced opacity
- ✅ Dashboard stat card showing total overdue count
- ✅ Unified `status` field ("active" or "completed") for completion tracking
- ✅ Dark theme support for overdue indicators
**Implementation Approach:**
- Extended activity data model with `dueDate` (ISO date string) and `status` ("active"/"completed") fields
- Added `<input type="date">` to the activity form
- `getOverdueCount()` — counts activities where `dueDate` is set, `dueDate < today`, and `status !== "completed"`
- `markActivityComplete(id)` — sets `status = "completed"` on the activity
- `updateOverdueBadge()` — updates or hides the nav badge based on overdue count
- In `renderActivities()`, compare `dueDate` with today's date; apply `.activity-card.overdue` CSS class if past due
- Added separate `#activity-filter-status` dropdown for status filtering
- Sort activities: overdue first, then by date descending
- Dark theme support for overdue indicators
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`, `app/js/version.js`
**Tests:** `docs/testing/test-activity-due-date-tracking.js` (15/15 passed)

## Item 28: Contact Activity Quick-Add FAB
**Status:** Planned
**Description:** A floating action button (FAB) that provides instant access to log a quick activity (call, email, meeting, note) from any page, without navigating to the Activities page. This reduces friction for field sales reps who need to log interactions on the go.
**Features:**
- Fixed-position floating action button (bottom-right corner) with "+" icon
- Click expands to show activity type quick-select chips (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note, ✅ Task)
- Selecting a type opens a pre-filled activity modal with that type
- Optional contact selector dropdown to link the activity to an existing contact
- Auto-fills current date/time as defaults
- Button collapses after activity is created or modal is closed
- Visual pulse animation to draw attention on first page load (once, then dismissed)
- Dark theme support
**Implementation Approach:**
- Create `.fab-container` fixed-position div in HTML (bottom-right, circular button, shadow, hover scale)
- Add `.fab-expanded` class that reveals quick-select chips in a radial or vertical menu
- Wire click handlers: FAB click toggles expanded state, chip click opens activity modal with pre-filled type
- Reuse `showActivityModal()` with pre-filled `type` parameter
- Add contact dropdown (`<select>`) populated from `Storage.get(Storage.KEYS.CONTACTS)` to the quick-add form
- Add keyboard shortcut `Q` in global keydown listener
- Dark theme support for FAB
**Dependencies:** Activity Tracking (Item 0 - existing), Modal system (existing)

## Item 29: AI-Powered Contact Insights
**Status:** Planned
**Description:** An intelligent insights panel that analyzes contact data and surfaces actionable recommendations using rule-based AI patterns. This helps sales teams prioritize outreach and identify opportunities they might otherwise miss.
**Features:**
- Per-contact insight panel showing engagement score, last interaction summary, and recommended next action
- "Stale Contact" detection — contacts with no activity in 30+ days flagged for re-engagement
- Smart suggestions based on contact status and activity history (e.g., "VIP with no activity in 45 days — schedule a check-in call")
- Deal opportunity detection — if a contact has leads in proposal stage, surface urgency
- Insight badges on contact cards (🔥 High Priority, ⚠️ Needs Follow-up, ✅ Healthy)
- Dashboard summary of contacts needing attention
**Implementation Approach:**
- Create `calculateContactInsights(contact, activities, leads)` method using rule-based scoring
- Add insight panel to contact detail modal with engagement metrics and suggestions
- Add insight badge rendering to `renderContacts()` alongside existing duplicate badges
- Add "Contacts Needing Attention" card to dashboard
- Use existing notification and scoring patterns for consistency
- Dark theme support
**Dependencies:** Contact Management, Activity Tracking, Lead Management (all existing)

## Item 30: Advanced Contact Search and Filtering
**Status:** Planned
**Description:** Enhance the global search with advanced filtering capabilities including multi-field search, saved search presets, and filter combinations. This transforms search from a simple text lookup into a powerful data discovery tool.
**Features:**
- Multi-field search with field-specific operators (e.g., "company:Acme", "email:@gmail.com")
- Combined filters on Contacts page: status + company + search text simultaneously
- Saved search presets — users can name and save frequent filter combinations
- Search result count display and "clear all filters" quick action
- Filter history showing recently used searches
- Visual filter chips showing active filters with individual remove buttons
**Implementation Approach:**
- Extend global search parser to recognize field:operator syntax
- Add filter chip rendering system (`.filter-chip` CSS class) for active filters
- Add "Saved Searches" section to contacts toolbar with dropdown to load presets
- Store saved searches in `settings` table via backend API (key: `saved_searches`)
- Add `applyFilters(contacts, filters)` method that chains multiple filter conditions
- Keyboard shortcut `S` to focus advanced search
- Dark theme support for filter chips and saved search UI
**Dependencies:** Contact Management, Global Search (both existing)

## Item 31: Activity Recurrence and Reminders
**Status:** Planned
**Description:** Support for recurring activities (daily, weekly, monthly) with browser-based reminder notifications. This automates follow-up scheduling, ensuring critical activities like weekly check-ins and monthly reviews never slip through the cracks.
**Features:**
- Recurrence pattern selector on activity creation (None, Daily, Weekly, Monthly)
- End date or occurrence count for recurring series
- Browser Notification API integration for due date reminders
- Configurable reminder lead time (5 min, 15 min, 1 hour, 1 day before)
- " Snooze" option to reschedule a reminder (1 hour, tomorrow, next week)
- Visual indicator on recurring activity cards showing next occurrence date
- "Create Next" button to quickly generate the next occurrence in a series
- Summary count of upcoming reminders on dashboard
**Implementation Approach:**
- Extend activity data model with `recurrence` (none/daily/weekly/monthly), `recurrenceEndDate`, `reminderLeadTime` fields
- Add recurrence selector dropdown and reminder time dropdown to activity form
- Create `generateNextOccurrence(activityId)` method that clones the activity with the next due date
- Use `Notification.requestPermission()` on first use; store permission status in settings
- Create `checkDueReminders()` method that runs on page load and every 60 seconds via `setInterval`
- Compare current time against `dueDate - reminderLeadTime` for all active activities
- Add `.activity-recurring` CSS class with a repeating icon (🔄) and next occurrence badge
- Dark theme support
**Dependencies:** Activity Due Date Tracking (Item 27 - implemented), Activity Tracking (existing)

## Item 32: Contact Notes with Rich Text and Pinning
**Status:** Planned
**Description:** Enhance contact notes with rich text formatting support and the ability to pin important notes to the top of a contact's detail view. This improves note readability and ensures critical information is always visible.
**Features:**
- Rich text editor for notes (bold, italic, underline, bullet lists, numbered lists)
- Pin/unpin notes to keep critical information at the top
- Timestamped note entries with edit history
- Note search within a contact's notes
- Character count with optional length warning
- Notes visible in contact card preview (first 100 characters)
- Export notes as plain text or HTML
**Implementation Approach:**
- Replace `<textarea>` with `contenteditable` div or lightweight rich text library
- Store notes as HTML in the `notes` field, with a separate `notesPlain` fallback
- Add `pinned` (boolean) and `noteEntries` (array of {text, timestamp, pinned}) to contact model
- Render pinned notes first, then chronological entries
- Add pin/unpin toggle button (📌) on each note entry
- Add note search input to contact detail modal
- Use `DOMPurify` or manual HTML sanitization for XSS protection
- Dark theme support for rich text editor
**Dependencies:** Contact Management (existing)
