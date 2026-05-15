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
**Status:** Partially Implemented — Tags ✅ Done (Session 13 / v0.1.3); Custom Fields ⏳ Planned
**Description:** Allow users to add custom tags and fields to contacts and leads for better organization. Tags are fully implemented; custom fields remain planned.
**Features (Tags — Implemented):**
- ✅ Multi-tag support with color coding (create, edit, delete tags via Manage Tags modal)
- ✅ Tag assignment in contact edit form (checkbox selector with color dots)
- ✅ Tag badges rendered on contact cards (color-coded)
- ✅ Tags persist via backend API (`/api/tags` CRUD + `/api/tags/contacts/{id}/tags` assignment)
- ✅ Tags pre-selected when re-editing a contact
- ✅ Backend: `contact_tags` and `contact_tag_mapping` tables in PostgreSQL
- ⏳ Custom field creation (text, number, date, select) — planned
- ⏳ Filter by tags — planned
- ⏳ Tag-based grouping — planned
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/js/api.js`, `app/js/contacts-data-source.js`, `app/css/styles.css`, `backend/app/api/tags.py`, `backend/app/models/contact_tags.py`, `backend/app/repositories/tags_postgres_repository.py`, `backend/app/db/schema.py`

## Item 7: Activity Reminders and Notifications
**Status:** ✅ Implemented (v0.1.6)
**Description:** Browser-based notifications for upcoming activities and follow-up reminders.
**Features:**
- Configurable reminder times
- Browser notification API integration
- Overdue activity alerts
- In-app toast notifications with click-to-navigate
- Advance notice (0-3 days before due date)
- Settings persistence via backend
- Test notification button for permission verification
**Implementation:**
- `app/index.html` — Reminder settings card with form controls
- `app/js/app.js` — `bindReminders()`, `loadReminderSettings()`, `saveReminderSettings()`, `testNotification()`, `_showBrowserNotification()`, `_startReminderChecker()`, `_stopReminderChecker()`, `_checkReminders()`, `_showInAppReminder()`, `_autoStartReminders()`
- `app/css/styles.css` — Reminder settings UI styles, notification toasts, dark theme support
- `docs/testing/test-activity-reminders.js` — 15-test Playwright E2E suite (all passing)

## Item 8: Multi-User Support
**Status:** Planned
**Description:** Support for multiple user accounts with role-based access control.
**Features:**
- User registration and authentication
- Role-based permissions (admin, manager, sales)
- Activity ownership tracking
- Shared contact management

## Item 9: Bulk Contact Operations ✅ IMPLEMENTED
**Status:** Implemented (v0.1.x)
**Description:** Enable mass operations on multiple contacts simultaneously to improve productivity for power users managing large contact lists.
**Features:**
- ✅ Multi-select contacts with checkboxes
- ✅ Bulk status change (e.g., mark multiple contacts as VIP or Inactive)
- ✅ Bulk delete with confirmation dialog
- ✅ Bulk tag assignment
- ✅ "Select all" and "Select none" quick actions
**Implementation Details:**
- `bindBulkOperations()` in `app/js/app.js` — selects, bulk status change, bulk tag, bulk delete
- `bulkDeleteContactsInApi()`, `bulkUpdateContactsStatusInApi()` in `app/js/api.js`
- `POST /api/contacts/bulk-delete`, `POST /api/contacts/bulk-update-status` backend endpoints
- Floating `.bulk-action-bar` appears when contacts are selected
- Toast notification showing count of affected records
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/js/api.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-bulk-operations.js`

## Item 10: Contact Activity History Timeline ✅ IMPLEMENTED
**Status:** Implemented (Session 8)
**Description:** Display a per-contact timeline of all related activities, providing a complete interaction history at a glance when viewing a contact's details.
**Features:**
- ✅ Expandable activity timeline within contact detail modal (wide layout)
- ✅ Chronological display of all activities linked to the contact (newest first)
- ✅ Activity type icons for quick visual scanning (📞📧🤝📝📋)
- ✅ Inline activity creation from the contact detail view (prefilled contact name)
- ✅ Activity count badge on contact cards (📋 N)
- ✅ Mark activity complete from timeline (✅ button)
- ✅ Overdue activity highlighting in timeline (red left border, ⚠️ icon)
- ✅ Close button to exit detail view
- ✅ Dark theme support
**Implementation Approach:**
- Filter activities by contact ID when rendering contact modal
- Render timeline as a vertical list with connecting line and type icons
- Reuse existing activity creation form with pre-filled contact reference
- Add activity count to contact card footer
- Wide modal layout (`modal-wide` class) for better readability
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-contact-timeline-v2.js` (10/10 passed)
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

## Item 13: Quick Activity Logging from Cards ✅ IMPLEMENTED
**Status:** Implemented (Session v0.1.5)
**Description:** Add one-click activity logging buttons directly on contact cards, allowing users to quickly log calls, emails, meetings, or notes without navigating away from the list view.
**Features:**
- ✅ Quick-action buttons (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note) on each contact card
- ✅ Opens activity modal with type pre-filled based on button clicked
- ✅ Pre-fills the related contact reference automatically
- ✅ Activity created successfully end-to-end
- ✅ Dark theme support for quick action buttons
- ✅ 9/9 Playwright E2E tests passing
**Implementation Approach:**
- Added `card-quick-actions` div with 4 icon buttons to contact card HTML template in `app/js/app.js`
- Reused `showActivityModal()` but pre-fill the contact name and activity type via inline event handlers
- Wired up click handlers that call `showActivityModal()` with pre-filled type and contact
- Added CSS styles for `.card-quick-actions` button row with hover states and dark theme support
**Files Modified:** `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-quick-activity-logging.js` (9/9 passed)
**Dependencies:** Contact Management, Activity Tracking (all Item 0 - existing)

## Item 14: Dashboard Recent Items ✅ IMPLEMENTED
**Status:** Implemented
**Description:** Display recently added contacts and leads on the dashboard, giving users immediate visibility into their latest CRM activity without navigating to separate pages.
**Features:**
- ✅ "Recent Contacts" section showing the 5 most recently added contacts
- ✅ "Recent Leads" section showing the 5 most recently added leads
- ✅ Each item shows name, company/email, and creation timestamp
- ✅ Click item to navigate directly to its edit modal
- ✅ Sections collapse when no data exists
**Implementation Details:**
- `renderRecentContacts()` and `renderRecentLeads()` in `app/js/app.js`
- Fetches contacts/leads via API, sorts by `createdAt` descending, renders mini-card rows
- Integrated into dashboard grid alongside "Recent Activities" and "Lead Pipeline"
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Dependencies:** Contact Management, Lead Management (both Item 0 - existing)

## Item 15: AI-Powered Lead Recommendations ✅ IMPLEMENTED
**Status:** Implemented
**Description:** Use AI-driven insights to surface the most promising leads and suggest next-best actions, aligning with AICRM's "AI First" product vision. This helps sales teams prioritize their outreach efforts intelligently.
**Features:**
- ✅ "Recommended Actions" panel on dashboard showing top leads needing attention
- ✅ Smart suggestions based on lead score, stage duration, and engagement history (e.g., "Follow up with Acme Corp — qualified for 14 days")
- ✅ Stale lead detection — flags leads that haven't been contacted in over 7 days
- ✅ Priority ranking combining lead score, deal value, and time since last activity
- ✅ Visual priority indicators (urgent/high/normal) on recommendation cards
**Implementation Details:**
- `getLeadRecommendations(leads)` — scores leads by: (lead_score * 0.4) + (normalized_value * 0.3) + (engagement_recency * 0.3)
- `renderRecommendedActions(leads)` — renders "Recommended Actions" dashboard card with clickable lead rows
- Recency factor decreases over time since last linked activity (full points at day 0, zero after 14 days)
- CSS classes: `.recommendation-list`, `.recommendation-item`, `.recommendation-urgent`, `.recommendation-high`, `.recommendation-normal`
- Runs dynamically on dashboard render (no extra storage needed)
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-ai-recommendations.js`
**Dependencies:** Lead Scoring (Item 2 - implemented), Activity Tracking (Item 0 - existing)

## Item 16: Dashboard PDF Report Export
**Status:** ✅ Implemented (Session 7)
**Description:** Generate a shareable one-page PDF summary of dashboard metrics, enabling users to include CRM data in meetings, reports, and stakeholder communications without screenshots.
**Features:**
- "Export PDF Report" button on the dashboard
- PDF includes: stat cards summary, pipeline breakdown, recent activities, and revenue summary
- Report header with AICRM branding, generation timestamp, and company name
- Clean, print-optimized layout with proper margins and page breaks
- Filename format: `aicrm_report_YYYY-MM-DD.pdf`
**Implementation Approach:**
- Used browser `window.print()` with a dedicated `@media print` CSS stylesheet
- Created a printable report layout that hides navigation, sidebar, and interactive elements
- Styled the print view with clean typography, table borders, and proper section headers
- Added `#btn-export-pdf` button in `.dashboard-header-actions` container
- No external libraries needed — leverages native browser print-to-PDF capability
**Dependencies:** Dashboard (Item 0 - existing), Dashboard Revenue Summary (Item 12 - implemented)
**Files Modified:**
- `app/index.html` — Added `#btn-export-pdf` button in `.dashboard-header-actions`
- `app/js/app.js` — Added `bindPdfExport()` and `exportDashboardPdf()` methods
- `app/css/styles.css` — Added `@media print` CSS rules and `.dashboard-header-actions` styling
**Tests:** `docs/testing/test-pdf-export.js` — 6/6 tests passing

## Item 17: Contact Duplicate Detection ✅ IMPLEMENTED
**Status:** Implemented
**Description:** Automatically detect potential duplicate contacts when creating or editing contacts, helping users maintain a clean and deduplicated contact database. This prevents accidental data fragmentation where the same person exists under multiple entries.
**Features:**
- ✅ Real-time duplicate check by email address during contact creation/editing
- ✅ Duplicate check by name + company combination
- ✅ Warning modal showing matching existing contacts with "Keep both" or "Merge" options
- ✅ Merge option combines notes from both records and keeps the older record's ID
- ✅ Visual duplicate indicator badge on contact cards when duplicates exist
- ✅ "Find Duplicates" button in Contacts toolbar to scan entire contact list
**Implementation Details:**
- `findDuplicateContacts()` in `app/js/app.js` — searches existing contacts by email exact match and name+company match
- `showDuplicateModal()` / `mergeDuplicate()` — duplicate warning modal and merge workflow
- `GET /api/contacts/duplicates` backend endpoint
- `Duplicate*` models in `backend/app/models/contacts.py`
- CSS classes: `.contact-card-duplicate`, `.duplicate-badge`, `.duplicate-match-card`, `.duplicate-group`
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/js/api.js`, `app/css/styles.css`, `backend/app/api/contacts.py`, `backend/app/models/contacts.py`
**Tests:** `docs/testing/test-contact-duplicate-detection.js`
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

## Item 20: Activity Due Date Tracking and Overdue Alerts ✅ IMPLEMENTED
**Status:** Implemented (see also Item 27)
**Description:** Add due date support for Tasks and Meetings activity types, with visual overdue indicators on the activities timeline and dashboard. This transforms the activity tracker from a passive log into an actionable task management system.
**Features:**
- ✅ Due date field for Task and Meeting activity types (date picker)
- ✅ Visual overdue indicator: red border and "Overdue" badge on past-due activities
- ✅ "Overdue" filter option in the Activities page filter dropdown
- ✅ Overdue count displayed on dashboard stat cards
- ✅ Sort activities by due date (soonest first)
- ✅ Completed/checked state for tasks — toggle with a checkbox, visually strikethrough completed items
- ✅ Activities sorted by due date show overdue items at the top
**Implementation Details:**
- See Item 27 for full implementation details — this item is a duplicate/earlier entry for the same feature.
- Due date and status fields in activities data model
- `getOverdueCount()`, `markActivityComplete(id)`, `updateOverdueBadge()` in `app/js/app.js`
- Overdue CSS styling (`.activity-card.overdue` with red left border and badge)
- "Overdue" option in status filter dropdown
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-activity-due-date-tracking.js` (15/15 passed)
**Dependencies:** Activity Tracking (Item 0 - existing)

## Item 21: Quick Activity Log ✅ IMPLEMENTED
**Status:** Implemented
**Description:** A floating action button available on every page that lets users quickly log an activity (call, email, meeting, note, task) without navigating away from their current view. This reduces friction in activity tracking and encourages consistent logging by sales teams.
**Features:**
- ✅ Floating action button (FAB) visible on all pages (bottom-right corner)
- ✅ Clicking FAB opens quick-select chips for activity type selection
- ✅ Activity type selector (icon buttons: call, email, meeting, note, task)
- ✅ Success toast notification on save
- ✅ Dark theme support for FAB
**Implementation Details:**
- `bindFAB()` in `app/js/app.js` — FAB with quick-select chips
- CSS classes: `.fab-container`, `.fab-button`, `.fab-chips`, `.fab-chip`
- Reuses `showActivityModal()` with pre-filled type parameter
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
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

## Item 26: Lead Conversion Funnel Analytics ✅ IMPLEMENTED
**Status:** Implemented
**Description:** A visual funnel chart on the dashboard showing lead conversion rates between each pipeline stage, with drop-off analysis. This gives users immediate insight into where leads are lost in the sales process and which stages need improvement.
**Features:**
- ✅ Funnel visualization on dashboard showing each pipeline stage as a narrowing bar
- ✅ Conversion rate percentage between consecutive stages
- ✅ Drop-off count and percentage at each stage transition
- ✅ Total leads and overall conversion rate displayed as summary metrics
- ✅ Stage-by-stage breakdown table with count, value, conversion rate, drop-off rate, avg days in stage
- ✅ Color-coded stages matching existing pipeline stage badges
- ✅ Dark theme support
**Implementation Details:**
- `GET /api/analytics/funnel` backend endpoint in `backend/app/api/analytics.py`
- Returns: total_leads, lost_leads, won_leads, overall_conversion_rate, total_pipeline_value, won_value
- Per-stage: count, value, conversion_rate, drop_off, drop_off_rate, avg_days_in_stage, value_percentage, of_total
- `getFunnelAnalyticsFromApi` in `app/js/api.js`
- `renderAnalytics()` in `app/js/app.js` renders funnel chart + stage breakdown table
**Files Modified:** `backend/app/api/analytics.py`, `backend/app/models/analytics.py`, `backend/app/repositories/analytics_postgres_repository.py`, `app/js/api.js`, `app/js/app.js`, `app/index.html`, `app/css/styles.css`
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

## Item 28: Contact Activity Quick-Add FAB ✅ IMPLEMENTED
**Status:** Implemented (see also Item 21)
**Description:** A floating action button (FAB) that provides instant access to log a quick activity (call, email, meeting, note) from any page, without navigating to the Activities page. This reduces friction for field sales reps who need to log interactions on the go.
**Features:**
- ✅ Fixed-position floating action button (bottom-right corner)
- ✅ Click expands to show activity type quick-select chips (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note, ✅ Task)
- ✅ Selecting a type opens a pre-filled activity modal with that type
- ✅ Dark theme support
**Implementation Details:**
- See Item 21 for full implementation details — this item is a duplicate/earlier entry for the same feature.
- `bindFAB()` in `app/js/app.js`
- CSS classes: `.fab-container`, `.fab-button`, `.fab-chips`, `.fab-chip`
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
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

## Item 33: Workflow Automation Rules
**Status:** Planned
**Description:** Enable users to create automated workflow rules that trigger actions based on CRM events. This reduces manual follow-up work and ensures consistent processes across the sales pipeline.
**Features:**
- Visual rule builder with condition-action pairs (e.g., "IF lead value > $50K AND stage = proposal, THEN create follow-up activity in 7 days")
- Pre-built rule templates for common scenarios (stale contact follow-up, high-value lead escalation, new contact onboarding sequence)
- Trigger conditions based on: lead stage changes, value thresholds, time since last contact, contact status changes, activity completion
- Actions: create activity, send template email, change lead stage, add tag, send notification
- Rule enable/disable toggle with execution history log
- Rule conflict detection (warn when multiple rules match the same event)
- Dashboard widget showing recent automation executions
**Implementation Approach:**
- Create `workflow_rules` table in PostgreSQL (id, name, description, triggerConditions, actions, enabled, createdAt)
- Build rule engine in `app/js/workflow-engine.js` that evaluates rules on data changes
- Add Settings page section for managing workflow rules with CRUD UI
- Evaluate rules on: lead save/update, contact save/update, activity completion, daily scheduled check
- Store rule execution log in `workflow_executions` table for audit trail
- Add "Automation" nav item to sidebar with execution history view
- Dark theme support
**Dependencies:** Activity Tracking, Email Templates, Lead Management (all existing)

## Item 34: Communication Log and Unified Inbox
**Status:** Planned
**Description:** A centralized communication log that aggregates all interactions (calls, emails, meetings, notes) across contacts and leads into a single searchable timeline. This provides a complete view of customer communications and helps sales teams stay organized.
**Features:**
- Unified inbox view showing all communications sorted chronologically
- Filter by communication type (call, email, meeting, note, task)
- Filter by contact or lead association
- Search across all communication content and notes
- Communication summary cards with contact/lead context (name, company, status)
- Quick-reply from communication cards (opens email template with context)
- Daily/weekly communication volume statistics on dashboard
- Export communication log to CSV
- Mark communications as "important" with visual star indicator
**Implementation Approach:**
- Create `communications` table in PostgreSQL (id, type, contactId, leadId, subject, content, direction, createdAt, isImportant)
- Build unified inbox page with filter toolbar and chronological list view
- Add communication type icons and color-coded cards
- Implement search across subject, content, and associated contact/lead names
- Add "Quick Reply" button that opens email template modal with pre-filled contact variables
- Add communication volume stats to dashboard (calls this week, emails this week, etc.)
- Backend API endpoints: GET /api/communications, POST /api/communications, GET /api/communications/stats
- Dark theme support
**Dependencies:** Activity Tracking, Contact Management, Lead Management, Email Templates (all existing)

## Item 35: AI-Powered Contact Insights and Next-Best-Action
**Status:** Planned
**Description:** Leverage AI to analyze contact data and suggest intelligent next steps, surfacing insights that would otherwise be buried in manual review. This transforms AICRM from a passive record-keeping tool into an active sales assistant.
**Features:**
- AI-generated "Next Best Action" recommendation per contact (e.g., "Schedule follow-up call — no contact in 30 days")
- Sentiment analysis of contact notes and activity descriptions (positive/neutral/negative indicator)
- Predicted conversion likelihood score for leads based on engagement patterns, deal value, and stage
- AI summary of contact relationship health (e.g., "Strong relationship — frequent meetings, positive notes")
- "Ask AI" button on contact/lead detail modals for ad-hoc questions about the record
- Insight badges on contact and lead cards (⚡ Follow-up needed, ❤️ High engagement, ⚠️ At risk)
- Configurable insight refresh frequency (real-time, daily digest)
**Implementation Approach:**
- Create `/api/insights` backend endpoint that sends contact/lead data to configured LLM
- Use structured prompts to generate: next-best-action, sentiment score, conversion probability, relationship summary
- Cache insights in `contact_insights` table (contactId, leadId, nextBestAction, sentiment, conversionScore, summary, generatedAt, ttl)
- Add insight badges to card rendering with color-coded CSS classes
- Add "Ask AI" button that opens a chat-style panel in the detail modal
- Store LLM API configuration in settings (model, endpoint, temperature)
- Add Settings page section for AI configuration and insight preferences
- Dark theme support for insight badges and AI chat panel
**Dependencies:** Contact Management, Lead Management, Activity Tracking (all existing); requires LLM API configuration

## Item 36: Dashboard Customization and Widget System
**Status:** Planned
**Description:** Allow users to personalize their dashboard by adding, removing, reordering, and resizing stat cards and widgets. This gives each user a workspace tailored to their role and priorities.
**Features:**
- Drag-and-drop reordering of dashboard stat cards and widgets
- Toggle visibility of individual cards/widgets via a dashboard settings panel
- Resize widgets (small, medium, large) for different data densities
- Add new widget types: recent activities feed, top contacts list, conversion funnel chart, pipeline stage breakdown
- Save and load dashboard layouts as named presets (e.g., "Sales View", "Manager View")
- Default layout for new users with option to reset to defaults
- Per-user layout persistence (when multi-user support is implemented)
**Implementation Approach:**
- Store dashboard layout config in `settings` table (key: `dashboard_layout`, value: JSON array of {widgetId, visible, order, size})
- Implement drag-and-drop using native HTML5 Drag and Drop API (no external library)
- Add dashboard settings modal with toggle switches for each widget and drag handles for reordering
- Create widget rendering registry pattern — each widget is a self-contained render function
- Add new widget types: `recent-activities` (last 10 activities), `top-contacts` (by activity count), `pipeline-breakdown` (horizontal bar chart by stage), `conversion-funnel` (CSS-based funnel visualization)
- Add "Customize Dashboard" button in dashboard toolbar opening the settings panel
- Keyboard shortcut `Ctrl+D` to open dashboard customization
- Dark theme support for all new widget types
**Dependencies:** Dashboard (existing), Activity Tracking, Contact Management, Lead Management (all existing)

## Item 37: Contact Merge and Deduplication ✅ IMPLEMENTED
**Status:** Implemented
**Description:** Automatically detect and intelligently merge duplicate contact records to maintain data hygiene and prevent fragmented customer profiles. This is critical as contact lists grow and data is imported from multiple sources.
**Features:**
- ✅ Automatic duplicate detection based on matching email addresses and similar names
- ⏳ Fuzzy name matching algorithm (e.g., "Jon Smith" vs "John Smith") — not yet implemented
- ✅ Side-by-side comparison view showing field differences between potential duplicates
- ✅ Smart merge strategy: keep most recent data, combine notes, preserve all activity history
- ✅ Merge confirmation dialog with preview of merged result
- ⏳ "Mark as not duplicate" option — not yet implemented
- ⏳ Dashboard stat showing duplicate count — not yet implemented
- ⏳ Bulk merge capability — not yet implemented
- ✅ Post-merge audit log entry tracking which records were merged and when
**Implementation Details:**
- `findDuplicateContacts()`, `showDuplicateModal()`, `mergeDuplicate()` in `app/js/app.js`
- `GET /api/contacts/duplicates` backend endpoint
- `Duplicate*` models in `backend/app/models/contacts.py`
- CSS classes: `.contact-card-duplicate`, `.duplicate-badge`, `.duplicate-match-card`, `.duplicate-group`
- Email exact match and name+company combination matching implemented; fuzzy matching (Levenshtein) remains planned
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/js/api.js`, `app/css/styles.css`, `backend/app/api/contacts.py`, `backend/app/models/contacts.py`
**Tests:** `docs/testing/test-contact-duplicate-detection.js`
**Dependencies:** Contact Management, Activity Tracking, Audit Log (all existing)

## Item 38: Lead Assignment and Ownership
**Status:** Planned
**Description:** Enable team-based lead management by allowing leads to be assigned to specific team members, tracking ownership, and providing visibility into workload distribution. This bridges the gap between single-user CRM and full multi-user collaboration.
**Features:**
- Assign/unassign leads to team members via dropdown in lead cards and detail modal
- Owner avatar and name displayed prominently on lead cards
- "My Leads" filter showing only leads assigned to current user
- Unassigned leads pool view for easy claim/distribution
- Lead assignment history in audit log (who assigned what to whom and when)
- Workload dashboard showing leads per owner (count and total pipeline value)
- Round-robin auto-assignment option for new leads
- Notification when a lead is assigned to you
- Transfer ownership with optional handoff notes
**Implementation Approach:**
- Add `owner_id` and `owner_name` columns to `leads` table (nullable for backward compatibility)
- Create `team_members` table in PostgreSQL (id, name, email, role, isActive) for lightweight team management without full auth
- Add Settings page section for team member management (CRUD)
- Add owner dropdown to lead creation and edit forms
- Add "My Leads" and "Unassigned" filter options to leads page filter toolbar
- Add workload distribution widget to dashboard showing bar chart of leads per owner
- Add round-robin toggle in settings: when enabled, new leads cycle through active team members
- Backend API: `PATCH /api/leads/{id}/assign` for ownership changes with audit logging
- Add owner avatar (initials-based circle) to lead card header
- Keyboard shortcut `Ctrl+A` on leads page to open assignment modal for selected leads
- Dark theme support
**Dependencies:** Lead Management, Settings, Audit Log (all existing)

## Item 39: Smart Contact Notes with AI Summarization
**Status:** Planned
**Description:** Leverage AI to automatically summarize and organize contact notes, making it effortless to understand the history and key details of any customer relationship without scrolling through pages of raw notes. This transforms unstructured notes into actionable intelligence.
**Features:**
- AI-generated summary of contact notes displayed prominently in contact detail view
- Key points extraction — automatically identifies action items, decisions, and follow-ups from notes
- Sentiment trend indicator — tracks whether the relationship is improving, stable, or declining based on note content
- "Summarize Notes" button that generates a concise bullet-point summary on demand
- AI-powered note tagging — automatically suggests relevant tags from note content
- Searchable note archive with AI-enhanced full-text search (semantic matching, not just keyword)
- "Last AI Summary" timestamp with refresh button
- Configurable summary style (brief, detailed, action-focused)
**Implementation Approach:**
- Add `notes_summary` and `notes_summary_at` columns to `contacts` table (nullable, cached)
- Create `/api/contacts/{id}/summarize-notes` backend endpoint that sends notes to configured LLM with structured prompt
- Prompt template: "Summarize these contact notes in 3-5 bullet points. Extract: key decisions, action items, follow-up dates, and relationship sentiment."
- Add "🤖 Summarize" button in contact detail modal that calls the endpoint and displays results in a collapsible section
- Add sentiment indicator badge (🟢 Positive, 🟡 Neutral, 🔴 Negative) next to the summary
- Cache summary in database with TTL (e.g., 24 hours) to avoid redundant API calls
- Add Settings page option for summary style preference and auto-summarize toggle
- Debounced auto-summarize on note save (when enabled in settings)
- Dark theme support for summary section
**Dependencies:** Contact Management, Activity Tracking (existing); requires LLM API configuration (shared with Item 35)

## Item 40: Lead Conversion Funnel and Drop-off Analytics ✅ IMPLEMENTED
**Status:** Implemented (see also Item 26)
**Description:** Visualize the complete lead journey from acquisition to conversion with a dynamic funnel chart, identifying exactly where leads are dropping off and which stages need improvement. This provides data-driven insights for optimizing the sales process.
**Features:**
- ✅ Funnel visualization showing lead count and conversion rate at each stage
- ✅ Drop-off rate between consecutive stages (percentage lost)
- ✅ Time-in-stage analytics — average days spent at each stage
- ⏳ Funnel comparison over time — not yet implemented
- ⏳ Click-through navigation — not yet implemented
- ⏳ Export funnel as image — not yet implemented
- ⏳ Color-coded efficiency indicators — not yet implemented
- ⏳ Configurable conversion rate targets — not yet implemented
- ⏳ Dashboard widget showing mini funnel overview — not yet implemented
- ⏳ Keyboard shortcut `F` — not yet implemented
**Implementation Details:**
- See Item 26 for full implementation details — this item is a duplicate/expanded entry for the same core feature.
- `GET /api/analytics/funnel` backend endpoint returns: stage counts, drop-off percentages, avg days per stage, conversion rates
- `renderAnalytics()` in `app/js/app.js` renders funnel chart + stage breakdown table
- Core funnel analytics (conversion rates, drop-off, time-in-stage) are implemented; advanced features (period comparison, targets, export) remain planned
**Files Modified:** `backend/app/api/analytics.py`, `app/js/api.js`, `app/js/app.js`, `app/index.html`, `app/css/styles.css`
**Dependencies:** Lead Management (existing), Dashboard (existing)

## Item 41: Contact Communication Log and Interaction History ✅ IMPLEMENTED
**Status:** Implemented
**Description:** Provide a unified, chronological communication log for each contact that aggregates all interactions (emails sent via templates, calls logged, meetings held, notes added, activities completed) into a single scrollable timeline. This gives sales reps instant context before any outreach, eliminating the need to search across multiple pages.
**Features:**
- ✅ Unified timeline view combining activities in chronological order
- ✅ Communication type icons and color coding (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note, 📋 Task)
- ⏳ "Last Contacted" date prominently displayed on contact cards — not yet implemented
- ⏳ Days-since-last-contact indicator with color coding — not yet implemented
- ⏳ Quick-reply from communication log — not yet implemented
- ⏳ Filter communication log by type — not yet implemented
- ⏳ Search within communication history — not yet implemented
- ⏳ Export communication log for a contact as PDF or CSV — not yet implemented
- ⏳ AI-powered "Conversation Summary" — not yet implemented
- ⏳ Keyboard shortcut `H` — not yet implemented
**Implementation Details:**
- `showContactTimeline(contactId)` in `app/js/app.js` renders a chronological timeline of all activities linked to a contact
- Timeline accessible from contact detail modal
- CSS classes: `.timeline-item`, `.timeline-marker`, `.timeline-dot`, `.timeline-content`, `.timeline-header`, `.timeline-date`
- Core timeline view is implemented; advanced features (filtering, search, AI summary, export, quick-reply) remain planned
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-communication-timeline.js`
**Dependencies:** Contact Management, Activity Tracking, Email Templates (all existing)

## Item 42: Automated Follow-up Suggestions and Smart Reminders
**Status:** Planned
**Description:** Intelligently suggest when and how to follow up with contacts and leads based on their activity history, deal stage, and engagement patterns. This ensures no contact falls through the cracks and helps sales reps prioritize their outreach effectively.
**Features:**
- Dashboard widget showing "Follow-ups Due Today" with contact name, last interaction date, suggested action, and priority
- Per-contact follow-up suggestions in contact detail view (e.g., "Last called 14 days ago — schedule follow-up call")
- Suggested follow-up intervals based on contact status (VIP = 7 days, Active = 14 days, Inactive = 30 days) and lead stage
- "Suggest Follow-up" button that auto-creates an activity with the recommended type and date
- Follow-up history tracking — records when suggestions were made and whether they were acted upon
- Smart escalation — if a follow-up is ignored for 2+ cycles, escalate visibility (dashboard alert, red badge)
- Lead-specific follow-up logic — proposal stage leads get 3-day follow-up reminders, new leads get 5-day
- Weekly "Follow-up Report" — summarizes missed follow-ups and suggests priority actions for the week ahead
- Browser notifications for same-day follow-ups (when enabled)
- Keyboard shortcut `U` to open the follow-ups dashboard widget from any page
**Implementation Approach:**
- Create `follow_up_suggestions` computed logic in backend that evaluates each contact/lead against configurable rules
- Add `/api/follow-ups/due` endpoint returning contacts/leads needing follow-up, sorted by priority (escalated > VIP > hot leads > others)
- Add `/api/follow-ups/suggest/{contact_id}` endpoint returning personalized follow-up recommendation
- Store follow-up rules in `settings` table (key: `follow_up_rules`, value: JSON with intervals per status/stage)
- Add Settings page section for configuring follow-up intervals per contact status and lead stage
- Build "Follow-ups Due" dashboard widget showing top 5 urgent follow-ups with one-click activity creation
- Add follow-up suggestion section to contact detail modal with "Create Follow-up" button
- Track follow-up suggestion history in `follow_up_history` table (id, contact_id, suggested_at, suggested_action, acted_upon, completed_at)
- Add red escalation badge to contacts nav item showing count of escalated follow-ups
- Add browser notification integration using Notification API for same-day follow-ups
- Dark theme support
**Dependencies:** Contact Management, Lead Management, Activity Tracking, Dashboard (all existing)

## Item 43: Contact Import Wizard with AI-Powered Data Enrichment
**Status:** Planned
**Description:** A guided multi-step import wizard that not only imports contact data from CSV but also enriches it using AI — auto-detecting fields, suggesting corrections for typos, classifying industries, and appending missing data from public sources. This transforms raw spreadsheet imports into clean, structured CRM records with minimal manual effort.
**Features:**
- Multi-step wizard UI: Upload → Preview → Map Fields → Enrich → Confirm
- AI-powered field mapping — automatically detects which CSV columns map to CRM fields (name, email, phone, company, status)
- Data quality checks with AI suggestions (e.g., "Is 'Goggle Inc' a typo for 'Google Inc'?")
- Industry classification — AI assigns an industry tag based on company name and existing data
- Email validation with AI confidence scoring (detects malformed emails, disposable domains, role-based addresses)
- Duplicate detection with fuzzy matching — flags potential duplicates before import using AI similarity scoring
- Batch enrichment — after import, AI enriches records with missing fields (company size, location, LinkedIn URL) where possible
- Import progress bar with real-time row-by-row status
- Rollback capability — undo the entire import if results are unsatisfactory
- Import history log in Settings page showing date, source, record count, and enrichment stats
- Keyboard shortcut `I` on Contacts page to open import wizard
**Implementation Approach:**
- Build multi-step wizard component in `app/js/import-wizard.js` with state machine for step navigation
- Add `/api/contacts/import/preview` endpoint that parses CSV and returns field mapping suggestions
- Add `/api/contacts/import/enrich` endpoint that sends contact data to configured LLM for enrichment
- Add `/api/contacts/import/execute` endpoint that performs the actual import with transaction support
- Store import history in `import_history` table (id, source_file, imported_at, record_count, enriched_count, status)
- Add "Import History" section to Settings page
- Add Settings page option for auto-enrichment toggle and enrichment depth (basic/full)
- Dark theme support for wizard UI
**Dependencies:** Contact Management (existing); requires LLM API configuration (shared with Items 35, 39)

## Item 44: Sales Pipeline Analytics and Revenue Forecasting
**Status:** Planned
**Description:** AI-powered sales analytics that goes beyond basic pipeline visualization — providing revenue forecasts, win probability scoring, pipeline health metrics, and actionable insights. Sales managers can see not just where deals are, but how likely they are to close and when, enabling data-driven planning and resource allocation.
**Features:**
- Revenue forecast dashboard showing projected monthly/quarterly revenue based on pipeline stage probabilities
- Win probability scoring per lead — AI analyzes lead attributes, activity history, and stage duration to predict close likelihood (0-100%)
- Pipeline health score — composite metric (0-100) combining velocity, conversion rates, and stage distribution
- Deal aging analysis — highlights deals stuck in a stage beyond the average duration
- "At Risk" deals identification — AI flags deals likely to stall or close lost based on inactivity patterns
- Weighted pipeline value — each lead's value multiplied by its win probability for realistic forecasting
- Forecast accuracy tracking — compares predicted vs actual close rates over time
- Export forecast report as PDF for management presentations
- Dashboard widget showing monthly forecast trend (last 6 months)
- Keyboard shortcut `A` to open full analytics view from any page
**Implementation Approach:**
- Create `/api/analytics/pipeline` endpoint returning: weighted pipeline, stage velocities, aging data, health score
- Create `/api/analytics/forecast` endpoint returning: monthly projections, win probabilities, at-risk deals
- Build analytics page in `app/js/analytics.js` with CSS-only charts (bar charts, trend lines, gauges)
- Calculate win probability using a rule-based model: stage weight (40%) + activity recency (25%) + engagement score (20%) + deal value fit (15%)
- Store forecast settings in `settings` table (key: `forecast_settings`, value: JSON with stage probabilities, refresh interval)
- Add Settings page section for configuring stage win probabilities and forecast parameters
- Add "Pipeline Analytics" page accessible from navigation with full analytics dashboard
- Add compact forecast widget to main dashboard
- Dark theme support with adjusted chart colors
**Dependencies:** Lead Management, Activity Tracking, Dashboard (all existing)

## Item 45: Email Campaign Management and Tracking
**Status:** Planned
**Description:** A full-featured email campaign system that lets users compose, schedule, send, and track bulk email campaigns — building on the existing email templates feature. Users can segment their contacts and leads into mailing lists, track opens and clicks, and measure campaign effectiveness over time.
**Features:**
- Campaign creation wizard: select recipients (by contact status, lead stage, tags), pick a template, customize subject/body
- Campaign preview with variable substitution rendered for a sample contact
- Send now or schedule for later (date/time picker with timezone support)
- Campaign status tracking: draft, scheduled, sending, completed, failed
- Open tracking via invisible tracking pixel (records first open per recipient)
- Click tracking via URL rewriting (records clicks on tracked links)
- Campaign results dashboard: total sent, open rate, click rate, bounce rate, top clicked links
- Per-campaign recipient list with individual status (sent, opened, clicked, bounced)
- A/B subject line testing — send two variants to a small segment, auto-select winner
- Campaign archive with search and filter (by date, status, open rate)
- "Resend to non-openers" quick action
- Keyboard shortcut `C` on Templates page to start a new campaign
**Implementation Approach:**
- Create `email_campaigns` table (id, name, subject_a, subject_b, body, status, scheduled_at, sent_at, template_id, segment_config, a_b_enabled, winner)
- Create `campaign_recipients` table (id, campaign_id, contact_id, lead_id, status, opened_at, clicked_count, bounced, error_message)
- Create `campaign_clicks` table (id, campaign_id, contact_id, url, clicked_at)
- Add `/api/campaigns` CRUD endpoints and `/api/campaigns/{id}/send` for dispatch
- Add `/api/campaigns/{id}/results` for campaign analytics (open rate, click rate, top links)
- Build campaign management page with list view, creation wizard, and results dashboard
- Use a simple SMTP relay or mailto: fallback for actual email delivery (configurable in Settings)
- Tracking pixel served via `/api/campaigns/{id}/track/open/{contact_id}` endpoint
- Click tracking proxy via `/api/campaigns/{id}/track/click?url=...` endpoint
- Add Settings page section for SMTP configuration and tracking toggle
- Dark theme support
**Dependencies:** Email Templates (Item 3 - existing), Contact Management, Lead Management (existing)

## Item 46: Unified Activity Feed and Real-time Collaboration Notes
**Status:** Planned
**Description:** A centralized, real-time activity feed that aggregates all CRM interactions across contacts, leads, and campaigns into a single chronological stream. Combined with shared collaboration notes, this gives users a bird's-eye view of everything happening in the CRM and enables team context sharing even before full multi-user support is available.
**Features:**
- Unified feed showing all activities, lead stage changes, campaign sends, and contact updates in chronological order
- Feed filters: by date range, entity type (contact/lead/campaign), activity type, and status
- Real-time feed updates via Server-Sent Events (SSE) — new activities appear without page refresh
- Collaboration notes — attach rich-text notes to any contact or lead, visible to all team members
- Note threading — reply to existing notes for contextual discussion
- Note mentions — @mention syntax highlights and notifies team members (when multi-user is enabled)
- Pin important notes to the top of a contact/lead detail view
- Activity feed search with full-text search across descriptions and notes
- "Quiet hours" toggle — suppress feed updates and notifications during configured hours
- Export activity feed as CSV for compliance and audit purposes
- Keyboard shortcut `F` to open the activity feed overlay from any page
**Implementation Approach:**
- Create `collaboration_notes` table (id, entity_type, entity_id, content, author, parent_id, pinned, created_at, updated_at)
- Create `activity_log` table (id, entity_type, entity_id, action, description, metadata_json, created_at) for centralized event tracking
- Add `/api/feed` endpoint returning aggregated activity stream with pagination and filters
- Add `/api/feed/stream` SSE endpoint for real-time updates
- Add `/api/notes` CRUD endpoints for collaboration notes with threading support (parent_id)
- Build Activity Feed page with infinite scroll, filter bar, and search input
- Add notes section to contact and lead detail modals with rich-text editor (contenteditable div)
- Track lead stage changes and campaign events automatically via backend event hooks
- Add Settings page section for quiet hours configuration and feed retention period
- Dark theme support
**Dependencies:** Contact Management, Lead Management, Activity Tracking (all existing); enhances Multi-User Support (Item 8) when implemented

## Item 47: Contact and Lead Search with Advanced Filters
**Status:** Planned
**Description:** A powerful global search and filtering system that lets users find contacts and leads instantly using keyword search, combined advanced filters, and saved search presets. This addresses the growing need for quick data retrieval as contact and lead lists expand.
**Features:**
- Global search bar accessible from any page (keyboard shortcut `/` to focus)
- Full-text search across name, email, phone, company, and notes fields
- Advanced filter panel with combined criteria: date range, status/stage, score range, tags, source, deal value range
- Filter operators: equals, contains, greater than, less than, is empty, is not empty
- Saved search presets — users can name and save frequently used filter combinations
- Search result count and "No results" guidance suggesting broader terms
- Search result highlighting showing which fields matched
- Export search results to CSV
- Recent searches dropdown for quick re-access
- Keyboard shortcut `Esc` to clear search and close filter panel
**Implementation Approach:**
- Add `/api/search/contacts` and `/api/search/leads` endpoints with query parameter support for filters
- Build search bar component in header navigation with dropdown results
- Build filter panel as a slide-out sidebar with filter categories and apply/clear buttons
- Store saved searches in `saved_searches` table (id, name, entity_type, filter_json, created_at)
- Add `/api/saved-searches` CRUD endpoints
- Use PostgreSQL `ILIKE` for case-insensitive text search and `WHERE` clause building for structured filters
- Add search result page view showing matching contacts/leads in a compact list
- Dark theme support
**Dependencies:** Contact Management, Lead Management, Lead Scoring (Item 2 - existing); Tags (Item 6 - optional enhancement)

## Item 48: Smart Follow-up Suggestions and Engagement Scoring
**Status:** Planned
**Description:** AI-powered follow-up recommendations that analyze each contact's and lead's interaction history to suggest the next best action — including optimal timing, communication channel, and suggested talking points. Combined with an engagement score, users can prioritize who to reach out to next.
**Features:**
- Per-contact/lead engagement score (0-100) based on recency, frequency, and diversity of interactions
- Smart follow-up suggestions: "Last contacted 14 days ago — suggest follow-up call", "No response to last email — try phone", etc.
- Recommended next action type (call, email, meeting, task) based on interaction patterns
- Suggested follow-up timing with reasoning ("Contact typically responds within 3 days")
- Engagement score displayed on contact/lead cards with color coding (High/Medium/Low/Inactive)
- "Needs Attention" list showing contacts/leads with declining engagement
- Follow-up suggestion acceptance creates a pre-filled activity automatically
- Engagement trend indicator (improving, stable, declining) per contact/lead
- Bulk follow-up queue — select multiple suggested follow-ups and schedule them at once
- Keyboard shortcut `N` to open "Next Best Actions" overlay from any page
**Implementation Approach:**
- Create `engagement_scores` table (id, entity_type, entity_id, score, trend, last_updated_at, factors_json)
- Create `/api/engagement/{entity_type}/{entity_id}` endpoint returning score, trend, and follow-up suggestions
- Create `/api/engagement/suggestions` endpoint returning top follow-up candidates across all entities
- Calculate engagement score using: recency weight (40%), frequency weight (30%), diversity weight (20%), recency-of-last-response (10%)
- Generate follow-up suggestions using rule-based logic analyzing activity gaps, response patterns, and stage context
- Add engagement score badge to contact/lead cards
- Add "Next Best Actions" overlay page showing prioritized follow-up queue
- Add Settings page section for configuring engagement thresholds and suggestion frequency
- Dark theme support
**Dependencies:** Contact Management, Lead Management, Activity Tracking (all existing); enhances Lead Scoring (Item 2) patterns

## Item 49: Contact Communication Preferences and Do-Not-Contact List
**Status:** Planned
**Description:** Manage how and when to communicate with each contact, respecting their preferences and compliance requirements. This builds trust and ensures the CRM supports ethical, consent-driven outreach.
**Features:**
- Per-contact communication preferences: preferred channel (email, phone, meeting), preferred times, frequency limit
- Do-not-contact flag with reason tracking (opt-out, compliance, personal request)
- Automatic suppression — contacts on do-not-contact list are excluded from campaigns, search results (configurable), and follow-up suggestions
- Preference violation warnings — alert user when attempting to contact outside stated preferences
- Consent tracking — record when and how consent was obtained (date, method, source)
- AI-powered preference inference — analyze interaction history to suggest likely preferences for contacts without explicit settings
- Compliance export — generate reports of consent records and do-not-contact lists for regulatory purposes
- Keyboard shortcut `D` on contact detail to toggle do-not-contact status
**Implementation Approach:**
- Create `contact_preferences` table (id, contact_id, preferred_channel, preferred_days, preferred_hours_start, preferred_hours_end, max_frequency_per_week, do_not_contact, do_not_contact_reason, consent_date, consent_method, consent_source, created_at, updated_at)
- Add `/api/contacts/{id}/preferences` CRUD endpoints
- Add `/api/compliance/do-not-contact` endpoint for bulk export of suppression list
- Filter logic in campaign dispatch, follow-up suggestions, and search to respect do-not-contact flags
- Add preferences section to contact detail modal with editable fields
- Add visual indicator (🚫 badge) on contact cards for do-not-contact contacts
- Add preference violation warning toast when creating activities that conflict with preferences
- Dark theme support
**Dependencies:** Contact Management (existing); enhances Email Campaigns (Item 45), Smart Follow-up (Item 48)

## Item 50: Win/Loss Reason Tracking and Deal Post-Mortem Analysis
**Status:** Planned
**Description:** Capture structured reasons for won and lost deals to generate actionable insights about what drives success and failure in the sales pipeline. Combined with AI-powered pattern detection, this turns historical deal data into strategic intelligence.
**Features:**
- Win/loss reason fields on leads when stage changes to Won or Lost (multi-select from predefined categories + free-text)
- Predefined reason categories: Price, Competition, Timing, Features, Budget, Decision Maker, Relationship, Other
- Deal post-mortem summary — auto-generated summary of the deal journey (activities, timeline, key moments)
- Win rate tracking by reason, source, stage duration, and deal size
- AI-powered pattern detection — "Deals over $50K with 'Price' as loss reason take 3x longer in proposal stage"
- Visual win/loss breakdown charts on dashboard (pie/donut chart)
- Exportable post-mortem report per deal (PDF-ready HTML)
- "Lessons Learned" field on won/lost leads for manual notes
- Keyboard shortcut `W` on a won/lost lead to open the post-mortem view
**Implementation Approach:**
- Add `win_loss_reasons` table (id, lead_id, reasons_json, lessons_learned, created_at, updated_at)
- Add `stage_change_log` table (id, lead_id, from_stage, to_stage, changed_at, actor) for tracking stage transitions
- Add `/api/leads/{id}/win-loss` CRUD endpoints for reason tracking
- Add `/api/analytics/win-loss` endpoint returning aggregated win/loss statistics
- Add `/api/analytics/deal-post-mortem/{lead_id}` endpoint returning full deal journey
- Add win/loss reason selection UI as a modal triggered when lead stage changes to Won/Lost
- Add win/loss breakdown card to dashboard with visual chart
- Add post-mortem detail view with timeline, reasons, and AI-generated insights
- Calculate stage durations from stage_change_log for pattern analysis
- Dark theme support
**Dependencies:** Lead Management, Lead Scoring (Item 2 - existing); enhances Sales Pipeline Analytics (Item 44) when implemented

## Item 51: Contact Duplicate Detection and Merge ✅ IMPLEMENTED
**Status:** Implemented (see also Items 17, 37, 58, 65)
**Description:** Automatically detect duplicate contacts and leads based on email, phone, and name similarity, then provide a guided merge workflow to consolidate records without data loss. Reduces data quality issues and ensures a single source of truth per person.
**Features:**
- ✅ Automatic duplicate detection on contact creation (email match, name+company match)
- ✅ Duplicate preview modal showing side-by-side comparison of conflicting records
- ✅ Guided merge workflow — combines notes, preserves activity history
- ✅ Activity history preservation — all activities from both records are retained after merge
- ⏳ "Mark as Duplicate" and "Unmark" functionality — not yet implemented
- ⏳ Duplicate count badge on Contacts and Leads pages — not yet implemented
- ⏳ AI-powered fuzzy matching — not yet implemented
- ⏳ Deduplication report — not yet implemented
- ⏳ Keyboard shortcut `M` — not yet implemented
**Implementation Details:**
- See Items 17 and 37 for full implementation details — this item is a duplicate entry for the same feature.
- `findDuplicateContacts()`, `showDuplicateModal()`, `mergeDuplicate()` in `app/js/app.js`
- `GET /api/contacts/duplicates` backend endpoint
- Email exact match and name+company matching implemented; fuzzy matching (Levenshtein) remains planned
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/js/api.js`, `app/css/styles.css`, `backend/app/api/contacts.py`, `backend/app/models/contacts.py`
**Tests:** `docs/testing/test-contact-duplicate-detection.js`
**Dependencies:** Contact Management, Lead Management (both existing); enhances Data Backup (data integrity)

## Item 52: Sales Pipeline Kanban Board View ✅ IMPLEMENTED
**Status:** Implemented
**Description:** A visual drag-and-drop Kanban board view for the leads pipeline, providing an intuitive alternative to the card-list view. Enables rapid stage changes, visual pipeline health assessment, and bulk lead management through spatial organization.
**Features:**
- ✅ Kanban board with columns for each pipeline stage (New, Contacted, Qualified, Proposal, Won, Lost)
- ✅ Drag-and-drop leads between stages to update pipeline status
- ✅ Stage summary showing lead count and total value per column
- ✅ Inline lead cards showing name, company, value, score badge, and days in stage
- ✅ Color-coded stage headers with count badges
- ✅ Click lead card to open full detail modal
- ✅ Stage duration tracking — visual indicator for stale leads (yellow/red border based on days in stage)
- ⏳ Column resize and reorder — not yet implemented
- ⏳ Quick-add lead button on each column header — not yet implemented
- ✅ Toggle between Kanban and List views
- ⏳ AI-powered stage progression suggestions — not yet implemented
- ⏳ Keyboard shortcut `K` — not yet implemented
**Implementation Details:**
- `renderKanbanBoard()` in `app/js/app.js` — full drag-and-drop Kanban implementation
- HTML5 Drag and Drop API for stage transitions, calls `PATCH /api/leads/{id}` on drop
- CSS classes: `.kanban-board`, `.kanban-column`, `.kanban-card`, `.kanban-header`, `.kanban-drag-over`, `.view-toggle`
- Days-in-stage calculated from `created_at` or last stage-change timestamp
- Stage summary row at top of each column (count + total value)
- View toggle button (Kanban/List) in Leads page header
- Dark theme support with appropriate column backgrounds
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-kanban-view.js` (10/10 passed)
**Dependencies:** Lead Management, Lead Scoring (Item 2 - existing); complementary to Calendar Integration (Item 4)

## Item 53: Natural Language Activity and Contact Search
**Status:** Planned
**Description:** Enable users to search contacts, activities, and leads using natural language queries instead of rigid filters. Leverages AI to parse intent and map to structured search criteria, dramatically improving discoverability.
**Features:**
- Natural language search bar on Contacts, Activities, and Leads pages (e.g., "calls from last week about pricing", "VIP customers in New York", "leads over $50K that are stale")
- AI-powered query parsing — converts natural language into structured filters (entity type, date range, keywords, value thresholds, status)
- Fuzzy matching on names, companies, and notes using Levenshtein distance
- Search result highlighting — matched terms highlighted inline for quick scanning
- Recent searches history with one-click re-run
- Search suggestions and autocomplete as user types
- AI-powered "Did you mean?" suggestions for misspelled queries
- Keyboard shortcut `S` to focus the natural language search bar
**Implementation Approach:**
- Create `/api/search/natural-language` endpoint accepting a query string and returning matching entities across contacts, activities, and leads
- Backend uses keyword extraction + fuzzy matching for now; can be upgraded to LLM-based parsing in future
- Frontend adds a prominent search input with autocomplete dropdown showing results in real-time (debounced)
- Highlight matching text in results using `<mark>` tags
- Store recent searches in `sessionStorage` for quick re-access
- Dark theme support
**Dependencies:** Contact Management, Activity Tracking, Lead Management (all existing)

## Item 54: Contact Activity Heatmap and Engagement Analytics
**Status:** Planned
**Description:** A visual heatmap showing contact engagement patterns over time, helping users identify which contacts are most active, when they're most responsive, and which relationships need attention.
**Features:**
- GitHub-style contribution heatmap showing activity density per contact (color intensity = number of activities per day)
- Per-contact engagement score — composite metric based on activity frequency, recency, and diversity of interaction types
- "Best time to contact" suggestion — analyzes historical response patterns to recommend optimal outreach windows
- Contact comparison view — side-by-side engagement heatmaps for up to 3 contacts
- Monthly engagement trend line — line chart showing activity volume over the past 30/60/90 days
- "At Risk" contacts — contacts with declining engagement (fewer activities over time) flagged with warning indicator
- Export engagement report as PDF-ready HTML
- Dashboard widget showing top 5 most and least engaged contacts
- Keyboard shortcut `H` to open heatmap view from contact detail
**Implementation Approach:**
- Frontend-only visualization using existing `/api/activities` data — no new backend tables needed
- Create `/api/analytics/engagement/{contact_id}` endpoint returning activity frequency data grouped by day
- Calculate engagement score as: (activity_count * 0.4) + (recency_bonus * 0.3) + (type_diversity * 0.3)
- Render heatmap as CSS grid with color-coded cells (light → dark green for low → high activity)
- Use Canvas API for trend line charts
- Add "Best Time" algorithm: group activities by hour-of-day, find peak interaction windows
- Dark theme support with adjusted color palette
**Dependencies:** Activity Tracking, Contact Management (both existing); complements Contact Tags (Item 6)

## Item 55: Lead Conversion Funnel and Drop-off Analysis ✅ IMPLEMENTED
**Status:** Implemented (see also Items 26, 40)
**Description:** A comprehensive visual funnel showing how leads progress through each stage of the sales pipeline, with conversion rates and drop-off analysis at every step. Helps identify bottlenecks and optimize the sales process.
**Features:**
- ✅ Funnel visualization showing lead count and conversion rate at each stage
- ✅ Drop-off rate between consecutive stages (percentage lost)
- ✅ Time-in-stage analytics — average days spent at each stage
- ✅ Stage-by-stage breakdown table with count, value, conversion rate, drop-off rate, avg days in stage
- ✅ Color-coded stages matching existing pipeline stage badges
- ✅ Dark theme support
- ⏳ Funnel comparison over time — not yet implemented
- ⏳ Click-through navigation — not yet implemented
- ⏳ Export funnel as image — not yet implemented
- ⏳ Configurable conversion rate targets — not yet implemented
**Implementation Details:**
- See Items 26 and 40 for full implementation details — this item is a duplicate entry for the same feature.
- `GET /api/analytics/funnel` backend endpoint returns: stage counts, drop-off percentages, avg days per stage, conversion rates
- `renderAnalytics()` in `app/js/app.js` renders funnel chart + stage breakdown table
- Core funnel analytics (conversion rates, drop-off, time-in-stage) are implemented; advanced features (period comparison, targets, export) remain planned
**Files Modified:** `backend/app/api/analytics.py`, `app/js/api.js`, `app/js/app.js`, `app/index.html`, `app/css/styles.css`
**Dependencies:** Lead Management (existing), Dashboard (existing)

## Item 56: Contact Communication Preferences and Do-Not-Contact List
**Status:** Planned
**Description:** Track and respect how each contact prefers to be communicated with, and maintain a do-not-contact list for compliance and relationship management. Prevents accidental outreach via unwanted channels and helps teams follow communication best practices.
**Features:**
- Communication preference fields per contact: preferred channel (Email, Phone, Meeting), preferred times (morning/afternoon/evening), frequency limit (daily/weekly/monthly)
- Do-not-contact flag with reason tracking (opted out, request, compliance) and effective date
- Visual warning when creating activities that conflict with contact preferences (e.g., phone call when contact prefers email)
- Do-not-contact filter on Contacts page to quickly see excluded contacts
- Compliance report — list of contacts on do-not-contact list with dates and reasons
- AI-powered suggestion — "Contact John prefers email in the morning; schedule next outreach accordingly"
- Activity type blocking — prevent creating activities of blocked types for do-not-contact contacts
- Preference quick-edit from contact card (icon-based: 📧📞🤝)
- Dashboard stat showing count of contacts on do-not-contact list
- Keyboard shortcut `P` to toggle communication preferences panel in contact detail
**Implementation Approach:**
- Add `communication_preferences` JSON column to `contacts` table (preferred_channel, preferred_times, frequency_limit, do_not_contact, dnc_reason, dnc_date)
- Create `/api/contacts/{id}/preferences` PATCH endpoint for updating preferences
- Frontend adds preferences section to contact edit modal with channel selector, time preference, and do-not-contact toggle
- Add preference warning banner in activity creation form when type conflicts with contact preferences
- Add do-not-contact filter to Contacts page status dropdown
- AI suggestions generated in `renderRecommendedActions()` and contact detail view
- Dark theme support
**Dependencies:** Contact Management, Activity Tracking (both existing); enhances Contact Tags (Item 6) for segmentation

## Item 57: Contact Import Wizard
**Status:** Planned
**Description:** Multi-step guided import wizard for contacts with column mapping, data preview, validation summary, and duplicate detection. Provides a polished, error-resistant experience for bulk contact imports that goes beyond the basic CSV import.
**Features:**
- Step 1: File selection with drag-and-drop support and file type validation (.csv, .json)
- Step 2: Column mapping — auto-detect column headers with manual override for mismatched fields
- Step 3: Data preview — paginated preview of parsed rows with validation warnings (invalid email, missing name, etc.)
- Step 4: Duplicate detection — show rows that would create duplicates based on email/name match, with options to skip, merge, or overwrite
- Step 5: Import summary — show count of imported, skipped, and merged contacts with success notification
- Progress bar and cancel button throughout the wizard
- Import history tracking — store last 5 import summaries in settings
- AI-powered column mapping suggestions — detect likely column mappings even with non-standard headers
- Template download — provide a CSV template file with all supported columns and example data
**Implementation Approach:**
- Create wizard modal with 5 step panels in `app/index.html`
- Add `openImportWizard()`, `parseImportFile()`, `mapColumns()`, `detectDuplicates()`, `executeImport()` methods in `app/js/app.js`
- Backend endpoint `POST /api/contacts/import/validate` for server-side validation
- Backend endpoint `POST /api/contacts/import/execute` for server-side import with transaction support
- CSS wizard styles: `.import-wizard`, `.wizard-step`, `.wizard-progress`, `.column-mapping`, `.data-preview-table`
- Duplicate detection uses email and name+company combination matching
**Dependencies:** Contact Management, CSV Import (both existing); builds on Bulk Contact Operations (Item 9)

## Item 58: Contact Merge and Duplicate Detection ✅ IMPLEMENTED
**Status:** Implemented (see also Items 17, 37, 51, 65)
**Description:** A comprehensive duplicate detection and merge system that automatically identifies duplicate contacts based on email and name+company matching, then provides a guided merge workflow to consolidate records without data loss.
**Features:**
- ✅ Automatic duplicate detection on contact creation (email exact match, name+company match)
- ✅ Side-by-side comparison view showing field differences between potential duplicates
- ✅ Smart merge strategy: keeps most recent data, combines notes, preserves all activity history
- ✅ Merge confirmation dialog with preview of merged result
- ✅ Duplicate badge on contact cards
- ✅ Audit log entry for each merge operation
- ⏳ Fuzzy name matching (Levenshtein distance) — not yet implemented
- ⏳ "Mark as not duplicate" option — not yet implemented
- ⏳ Bulk merge capability — not yet implemented
- ⏳ Dashboard stat showing duplicate count — not yet implemented
**Implementation Details:**
- See Items 17, 37, and 51 for full implementation details — this item is a duplicate entry for the same feature.
- `findDuplicateContacts()`, `showDuplicateModal()`, `mergeDuplicate()` in `app/js/app.js`
- `GET /api/contacts/duplicates` backend endpoint
- Email exact match and name+company combination matching implemented; fuzzy matching (Levenshtein) remains planned
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/js/api.js`, `app/css/styles.css`, `backend/app/api/contacts.py`, `backend/app/models/contacts.py`
**Tests:** `docs/testing/test-contact-duplicate-detection.js`
**Dependencies:** Contact Management, Activity Tracking, Audit Log (all existing)

## Item 59: Product and Service Catalog
**Status:** Planned
**Description:** A structured product and service catalog that can be attached to leads and deals, enabling accurate deal composition, product-level revenue analytics, and faster proposal generation. Moves beyond single-value deals to multi-product pipelines.
**Features:**
- Full CRUD for products/services: name, description, unit price, category, SKU, active/inactive status
- Associate multiple products with a lead/deal via a line-item interface (product selector, quantity, unit price override)
- Automatic deal value recalculation from line items (with optional manual override)
- Product category management with color-coded badges
- Product usage analytics — which products appear most frequently in won deals
- Revenue by product — dashboard stat showing which products generate the most revenue
- AI-powered product recommendations — "Customers who bought Product A also bought Product B" based on historical win patterns
- Quick-add product chips in the lead edit form for fast deal composition
- Export product catalog to CSV; import from CSV
- Dashboard widget showing top 5 products by revenue
- Keyboard shortcut `Shift+P` to open product catalog from any page
**Implementation Approach:**
- New `products` table: id, name, description, unit_price, category, sku, is_active, created_at, updated_at
- New `deal_line_items` table: id, lead_id, product_id, quantity, unit_price, total, created_at
- Backend endpoints: `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/{id}`, `POST /api/products/import`, `GET /api/analytics/products`
- Frontend adds Products navigation item and page with catalog grid view
- Lead edit modal gains a "Line Items" section with product dropdown, quantity input, and running total
- Revenue recalculation runs client-side on line item changes and on dashboard render
- AI product recommendations use co-occurrence analysis of won deals (client-side rule-based)
- CSS styles: `.product-card`, `.line-item-row`, `.product-chip`, `.product-analytics`
- Dark theme support
**Dependencies:** Lead Management, Dashboard Revenue Summary (both existing); enhances Sales Pipeline Kanban (Item 52) and Funnel Analytics (Item 55)

## Item 60: Sales Goals and Quota Tracking
**Status:** Planned
**Description:** Set monthly, quarterly, and annual sales targets with visual progress tracking, enabling teams to monitor performance against goals and receive AI-powered guidance on closing the gap.
**Features:**
- Create goals with target type (revenue, deals won, pipeline value), target amount, period (monthly/quarterly/annual), and start/end dates
- Visual progress bar on dashboard showing percentage toward each active goal (e.g., "67% of $100K monthly target")
- Per-goal breakdown: current value, remaining amount, days remaining, daily run-rate needed
- Goal status indicators: On Track (green), At Risk (orange), Off Track (red), Achieved (gold)
- Historical goal tracking — view past goals with achieved vs. target comparison
- AI-powered guidance — "At current pace, you'll miss the goal by $15K. Focus on these 3 high-value leads to close the gap"
- Goal creation wizard with smart defaults (e.g., auto-set monthly target based on previous month's actuals)
- Dashboard widget showing all active goals as compact progress cards
- Goal achievement notifications — toast notification when a goal is reached
- Export goals history to CSV
- Keyboard shortcut `G` to open goal creation from dashboard
**Implementation Approach:**
- New `sales_goals` table: id, name, target_type (revenue/deals_won/pipeline_value), target_amount, period (monthly/quarterly/annual), start_date, end_date, status, created_at, updated_at
- Backend endpoints: `GET/POST /api/goals`, `GET/PATCH/DELETE /api/goals/{id}`, `GET /api/goals/{id}/progress`
- Progress calculation endpoint queries leads table for current period metrics matching the goal's target_type
- Frontend adds Goals page with goal cards showing progress bars, status badges, and AI guidance text
- Dashboard renders active goals as compact stat cards alongside existing metrics
- AI guidance generated client-side: compares daily run-rate (current_value / days_elapsed) against daily target (target_amount / total_days)
- CSS styles: `.goal-card`, `.progress-bar`, `.goal-status`, `.ai-guidance`
- Dark theme support with adjusted progress bar colors
**Dependencies:** Dashboard, Lead Management, Dashboard Revenue Summary (all existing); complements Sales Pipeline Analytics (Item 44)

## Item 61: Win/Loss Reason Tracking
**Status:** Planned
**Description:** Capture structured reasons why deals were won or lost, enabling data-driven analysis of sales performance and identification of recurring patterns. Combines with AI to surface actionable insights from historical win/loss data.
**Features:**
- Add win/loss reason fields to lead edit form when stage changes to Won or Lost
- Pre-configured reason categories: Price, Competition, Timing, Fit, Budget, Decision Maker, Other
- Custom reason text field for detailed notes
- Win/Loss analytics dashboard card showing reason distribution as a visual chart
- AI-powered insight generation — "60% of lost deals cite price as the primary factor; consider adjusting pricing for deals under $20K"
- Filter leads by win/loss reason
- Export win/loss analysis to CSV
- Keyboard shortcut `Shift+W` to open win/loss analysis from dashboard
**Implementation Approach:**
- Add `win_loss_reasons` table: id, lead_id, outcome (won/lost), reason_category, reason_text, created_at, updated_at
- Backend endpoints: `POST /api/leads/{id}/win-loss`, `GET /api/analytics/win-loss`, `GET /api/analytics/win-loss/insights`
- Frontend adds win/loss reason modal triggered on stage change to Won/Lost
- Dashboard card renders reason distribution using CSS bar charts (no external chart libraries)
- AI insights generated client-side using rule-based pattern detection on reason frequency and correlation with deal value
- CSS styles: `.win-loss-modal`, `.reason-category`, `.reason-chart`, `.ai-insight`
- Dark theme support
**Dependencies:** Lead Management, Dashboard Revenue Summary (both existing); enhances Sales Goals and Quota Tracking (Item 60)

## Item 62: Contact Communication Preferences
**Status:** Planned
**Description:** Track and respect individual contact communication preferences (email, phone, meeting, preferred times, Do Not Contact) to improve engagement quality and compliance. AI suggests optimal contact timing based on historical response patterns.
**Features:**
- Communication preference fields on contact edit form: preferred channel (email/phone/meeting), preferred contact hours, Do Not Contact flag
- Visual indicators on contact cards showing preferred channel icon and DNC status
- Activity creation form warns when scheduling outside preferred hours or contacting a DNC contact
- Filter contacts by communication preference (e.g., show only email-preferred contacts)
- AI-powered optimal timing suggestion — "Contact prefers email on weekday mornings; last responded within 2 hours"
- Bulk update communication preferences via bulk operations bar
- Export contacts with communication preferences to CSV
- Compliance tracking — log when DNC contacts are attempted to be contacted (audit trail)
**Implementation Approach:**
- Add columns to contacts table: preferred_channel (email/phone/meeting/null), preferred_hours_start, preferred_hours_end, do_not_contact (boolean)
- Frontend updates contact edit modal with preference section (channel radio buttons, time inputs, DNC checkbox)
- Contact cards render preference icon (📧/📞/🤝) and DNC badge (red "Do Not Contact")
- Activity form validates against preferences: shows warning toast if time falls outside preferred hours or contact is DNC
- Backend adds preference fields to contact CRUD endpoints
- AI optimal timing generated client-side: analyzes activity history timestamps to detect response patterns
- CSS styles: `.comm-preference`, `.dnc-badge`, `.preference-warning`
- Dark theme support
**Dependencies:** Contact Management, Activity Tracking, Contact Tags (all existing); complements Activity Reminders and Notifications (Item 7)

## Item 63: Lead Stage Aging and SLA Tracking ✅ IMPLEMENTED
**Status:** Implemented
**Description:** Track how long leads spend in each pipeline stage and flag leads that exceed configurable time thresholds. This ensures leads don't stagnate and helps sales teams prioritize stale opportunities.
**Features:**
- ✅ Days-in-stage counter displayed on lead cards and Kanban board
- ✅ Visual aging indicators: green (fresh), yellow (approaching threshold), red (overdue/stale)
- ✅ Configurable SLA thresholds per stage in Settings
- ✅ "Stale Leads" filter to surface leads exceeding their stage SLA
- ✅ Stale lead count on dashboard
- ✅ Stage aging analytics in funnel breakdown (avg days in stage per stage)
- ✅ Dark theme support
- ⏳ Automated email notifications for stale leads — not yet implemented
- ⏳ AI-powered escalation suggestions — not yet implemented
**Implementation Details:**
- `getDaysInStage()` helper in `app/js/app.js` calculates days from `created_at` or last stage change
- CSS classes: `.lead-card-fresh`, `.lead-card-warning`, `.lead-card-stale` with colored left borders
- SLA thresholds stored in settings (per-stage day limits)
- "Stale" filter option in leads page filter dropdown
- Stale count displayed on dashboard stat cards
- Avg days-in-stage included in funnel analytics (`GET /api/analytics/funnel`)
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`, `backend/app/api/analytics.py`
**Dependencies:** Lead Management (existing), Lead Scoring (existing), Kanban View (Item 52)

## Item 64: Email Signature Parsing for Contact Creation
**Status:** Planned
**Description:** When pasting an email body into a quick-contact form, automatically detect and extract contact information from email signatures, dramatically reducing manual data entry for new contacts. AI-powered parsing handles diverse signature formats.
**Features:**
- Paste email body into a "Quick Contact from Email" modal and auto-extract name, email, phone, company, title, and website
- Handles common signature formats: block format, horizontal-rule separated, table-based, and plain text
- Pre-fills the contact creation form with extracted fields for user review before saving
- Confidence score for each extracted field (high/medium/low) with visual indicators
- Learning mode — user corrections improve future parsing accuracy for similar formats
- AI-powered disambiguation — separates signature data from email body content even without clear delimiters
- Batch mode — paste multiple email threads to extract multiple contacts at once
- Keyboard shortcut `Ctrl+V` in contacts page triggers quick-paste mode
- Export parsing results to CSV for bulk review
- Integration with email templates — use extracted contact data to auto-fill template variables
**Implementation Approach:**
- Client-side parsing engine using regex patterns for email addresses, phone numbers, URLs, and common signature markers ("Best regards,", "---", "•", "|")
- AI-enhanced parsing: rule-based extraction combined with pattern matching for title/company detection
- New modal: `.quick-paste-modal` with textarea input, parse button, and preview form showing extracted fields
- Each extracted field shown with a confidence badge and inline edit capability before saving
- Backend endpoint: `POST /api/contacts/parse-email` accepts email body text, returns structured contact data with confidence scores
- Parsing rules stored in settings for customization (e.g., organization-specific signature patterns)
- CSS styles: `.quick-paste-modal`, `.parsed-field`, `.confidence-badge`, `.batch-preview`
- Dark theme support
**Dependencies:** Contact Management (existing); enhances Email Templates (Item 3) and Contact Import Wizard (Item 43/55)

## Item 65: Contact Merge Tool ✅ IMPLEMENTED
**Status:** Implemented (see also Items 17, 37, 51, 58)
**Description:** A dedicated tool for detecting and merging duplicate contact records. Provides side-by-side comparison and a guided merge workflow that preserves all data including activities and notes.
**Features:**
- ✅ Duplicate detection based on email exact match and name+company combination
- ✅ Side-by-side comparison modal showing field differences
- ✅ Merge confirmation dialog with preview
- ✅ Smart merge: keeps most recent data, combines notes, preserves activity history
- ✅ Audit log entry for each merge
- ⏳ Fuzzy name matching (Levenshtein) — not yet implemented
- ⏳ "Mark as not duplicate" — not yet implemented
- ⏳ Bulk merge — not yet implemented
**Implementation Details:**
- See Items 17, 37, 51, and 58 for full implementation details — this item is a duplicate entry for the same feature.
- `findDuplicateContacts()`, `showDuplicateModal()`, `mergeDuplicate()` in `app/js/app.js`
- `GET /api/contacts/duplicates` backend endpoint
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/js/api.js`, `app/css/styles.css`, `backend/app/api/contacts.py`, `backend/app/models/contacts.py`
**Tests:** `docs/testing/test-contact-duplicate-detection.js`
**Dependencies:** Contact Management, Activity Tracking, Audit Log (all existing)

## Item 66: Communication Timeline View ✅ IMPLEMENTED
**Status:** Implemented (see also Items 10, 41)
**Description:** A chronological timeline view for each contact that consolidates all interactions — calls, emails, meetings, notes, and tasks — into a single scrollable feed. This gives users a complete narrative of their relationship with a contact at a glance.
**Features:**
- ✅ Chronological timeline feed showing all contact interactions
- ✅ Each timeline entry shows: icon + type badge (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note, ✅ Task), timestamp, and content preview
- ✅ Timeline accessible from contact detail modal
- ✅ Activity count badge on contact cards
- ✅ Inline activity creation from the contact detail view (prefilled contact name)
- ✅ Dark theme support
- ⏳ Expandable entries with full details inline — not yet implemented
- ⏳ Activity type filter — not yet implemented
- ⏳ Quick-reply from timeline — not yet implemented
- ⏳ Visual connectors between related activities — not yet implemented
- ⏳ AI-powered conversation summary — not yet implemented
- ⏳ AI-suggested next step — not yet implemented
**Implementation Details:**
- See Items 10 and 41 for full implementation details — this item is a duplicate entry for the same feature.
- `showContactTimeline(contactId)` in `app/js/app.js` renders a chronological timeline of all activities linked to a contact
- CSS classes: `.timeline-item`, `.timeline-marker`, `.timeline-dot`, `.timeline-content`, `.timeline-header`, `.timeline-date`
- Core timeline view is implemented; advanced features (filtering, search, AI summary, quick-reply) remain planned
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-communication-timeline.js`
**Dependencies:** Contact Management (existing); Activity Tracking (existing); Lead Management (existing)

## Item 67: Sales Pipeline Kanban Board View
**Status:** ✅ Implemented (Session 0.1.7)
**Description:** A visual drag-and-drop Kanban board for managing the sales pipeline, providing an intuitive alternative to the card-list lead view. Users can see all leads organized by stage in columns and move leads between stages by dragging cards, giving a bird's-eye view of the entire pipeline at a glance.
**Features:**
- ✅ Kanban board layout with columns for each pipeline stage (New, Contacted, Qualified, Proposal, Won, Lost)
- ✅ Lead cards within each column showing name, company, value, score badge, and days-in-stage
- ✅ Drag-and-drop lead cards between columns to update stage (with confirmation for Won/Lost)
- ✅ Column headers showing lead count and total pipeline value per stage
- ✅ Click a card to open the full lead detail modal (via edit/delete action buttons)
- ✅ Inline stage change via dropdown on each card (for non-drag users and keyboard accessibility)
- ✅ Filter board by stage or score tier — filters apply across all columns
- ✅ Visual stage aging indicators: green (≤7d), amber (8-14d), red (15d+)
- ✅ Board view toggle: switch between Kanban and card-list views on the Leads page
- ✅ Keyboard shortcut `K` to toggle Kanban view from leads page
- ✅ Dark theme support
**Implementation Approach:**
- New `.kanban-board` container with `.kanban-column` for each stage
- Native HTML5 drag-and-drop API for card movement (no external libraries)
- Backend endpoint: `PATCH /api/leads/{id}/stage` for stage updates
- Frontend drag handlers: `dragstart`, `dragover`, `drop` with visual drop-zone highlighting
- Stage values sent to backend on drop; optimistic UI update with rollback on failure
- CSS styles: `.kanban-board`, `.kanban-column`, `.kanban-card`, `.kanban-header`, `.kanban-drop-zone`
- Responsive: columns scroll horizontally on mobile; cards stack vertically
- Dark theme support
**Files Modified:** `backend/app/api/leads.py`, `app/js/api.js`, `app/js/app.js`, `app/index.html`, `app/css/styles.css`
**Tests:** `docs/testing/test-kanban.js` (12/12 passed)
**Dependencies:** Lead Management (existing); Lead Scoring (Item 2)

## Item 68: Smart Contact Notes with AI Summarization
**Status:** Planned
**Description:** Enhance the contact notes system with rich text editing, pinning, search, and AI-powered summarization. Instead of a single plain-text notes field, contacts can have multiple timestamped notes that are searchable, filterable, and automatically summarized by AI to surface key information quickly.
**Features:**
- Multiple notes per contact (replacing the single notes field) with timestamp, author, and content
- Rich text editor supporting bold, italic, lists, and links (no external library — custom toolbar)
- Pin important notes to the top of the list for quick reference
- Search within notes for a specific contact or across all contacts
- AI-powered summarization: generate a concise summary of all notes for a contact ("Key points: Interested in enterprise plan, budget $50K, decision by Q3")
- Note templates for common scenarios (meeting summary, call log, follow-up plan)
- Attach notes to specific activities for contextual linking
- Note categories: Meeting, Call, Research, Follow-up, Other
- Export notes as markdown or plain text
- Keyboard shortcut `Ctrl+Shift+N` to add a new note to the currently viewed contact
- Dark theme support
**Implementation Approach:**
- New database table: `contact_notes` (id, contact_id, category, content, is_pinned, created_at, updated_at)
- Backend endpoints: `GET/POST /api/contacts/{id}/notes`, `PATCH/DELETE /api/contacts/{id}/notes/{note_id}`, `GET /api/contacts/{id}/notes/summary` for AI summary
- Migrate existing single-field notes to the new multi-note system (one note per contact, pinned)
- Frontend: notes panel in contact detail modal with rich text toolbar, pin toggle, and search bar
- Rich text editor using `contenteditable` div with custom toolbar buttons
- AI summarization: client-side prompt construction sent to existing AI integration endpoint
- CSS styles: `.notes-panel`, `.note-card`, `.note-toolbar`, `.note-pinned`, `.note-search`, `.note-category-badge`
- Dark theme support
**Dependencies:** Contact Management (existing); AI integration (existing infrastructure for lead recommendations)

## Item 69: Automated Follow-up Reminders with AI-Powered Suggestions
**Status:** Planned
**Description:** An intelligent follow-up system that automatically suggests when and how to follow up with contacts and leads based on their interaction history, lead stage, time since last contact, and engagement patterns. AI analyzes the relationship context to generate personalized follow-up message templates and optimal timing recommendations.
**Features:**
- Automated follow-up scheduling based on configurable rules (e.g., "follow up 3 days after initial contact", "weekly check-in for Qualified leads")
- AI-generated follow-up message suggestions tailored to each contact's history and stage
- Follow-up priority scoring: combines days since last contact, lead score, deal value, and stage urgency
- Dashboard widget showing "Today's Follow-ups" with count, list, and quick-action buttons
- One-click follow-up creation: generates a scheduled activity with pre-filled message template
- Smart timing suggestions: "Best time to contact: Tuesday morning (based on past response patterns)"
- Follow-up templates per stage: different suggested messaging for New vs Qualified vs Proposal leads
- Integration with Activity Reminders: follow-ups create activities with due dates and notifications
- Stale contact detection: automatic flagging of contacts with no activity for configurable periods (7/14/30/60 days)
- Follow-up analytics: track follow-up response rates and optimal timing per contact segment
- Keyboard shortcut `Ctrl+F` to open today's follow-ups panel
- Dark theme support
**Implementation Approach:**
- New database table: `follow_up_rules` (id, name, trigger_stage, days_after_contact, message_template, is_active)
- Backend endpoints: `GET /api/follow-ups/today`, `GET /api/follow-ups/overdue`, `POST /api/follow-ups/rules`, `PATCH/DELETE /api/follow-ups/rules/{id}`, `POST /api/follow-ups/{contact_id}/create-activity`
- AI suggestion engine: client-side prompt construction using contact history, stage, and time-since-last-contact sent to existing AI integration
- Frontend: "Follow-ups" dashboard card showing today's suggestions with priority badges and quick-action buttons
- Rule engine: evaluates all contacts/leads against active rules on app load and every 30 minutes
- CSS styles: `.follow-ups-panel`, `.follow-up-card`, `.follow-up-priority`, `.follow-up-rule-config`, `.follow-up-quick-action`
- Dark theme support
**Dependencies:** Activity Reminders (Item 65 — implemented); Lead Scoring (Item 2 — implemented); AI integration (existing); Activity Tracking (existing)

## Item 70: Contact Relationship Mapping and Influence Network Visualization
**Status:** Planned
**Description:** A visual relationship map showing connections between contacts within the same organization and across organizations, helping users understand decision-making hierarchies, influence networks, and relationship gaps. This feature enables strategic account planning by visualizing the web of connections and identifying key decision-makers, champions, and blockers.
**Features:**
- Interactive force-directed graph visualization of contact relationships
- Relationship types: reports-to, colleague, decision-maker, champion, blocker, influencer
- Organization grouping: contacts from the same company automatically clustered together
- Influence scoring: AI-assisted scoring of each contact's influence level within their organization
- Path finding: "How am I connected to this person?" — shows shortest path through existing relationships
- Relationship strength indicators: based on interaction frequency, recency, and communication quality
- Account view: see all contacts for a single organization with their relationship map
- Add relationships via contact edit form: select another contact and define relationship type
- Relationship timeline: view when relationships were established and how they evolved
- Export relationship map as image (PNG/SVG) for presentations and meetings
- AI-powered relationship insights: "You have 3 contacts at Acme Corp but no decision-maker identified"
- Relationship-based lead scoring bonus: contacts with strong internal champions score higher
- Keyboard shortcut `Ctrl+R` to open relationship map for selected contact
- Dark theme support
**Implementation Approach:**
- New database table: `contact_relationships` (id, source_contact_id, target_contact_id, relationship_type, strength, created_at, notes)
- Backend endpoints: `GET /api/contacts/{id}/relationships`, `POST /api/contacts/{id}/relationships`, `DELETE /api/contacts/{id}/relationships/{rel_id}`, `GET /api/contacts/{id}/relationship-map`, `GET /api/contacts/{id}/influence-score`
- Frontend: relationship map using Canvas-based force-directed graph (no external library — custom D3-like layout engine)
- Force-directed layout: custom physics simulation with collision detection, gravity, and link forces
- Node rendering: contact avatar initials, influence ring color, relationship type icons
- Edge rendering: relationship type color-coding, strength-based line width, directional arrows
- AI influence scoring: prompt construction using contact role, company, interaction history, and relationship network
- CSS styles: `.relationship-map`, `.relationship-node`, `.relationship-edge`, `.relationship-legend`, `.relationship-panel`, `.influence-ring`
- Dark theme support
**Dependencies:** Contact Management (existing); Lead Scoring (Item 2 — implemented); AI integration (existing)

## Item 71: AI-Powered Meeting Notes and Action Item Extraction
**Status:** Planned
**Description:** An AI-enhanced meeting notes system that automatically extracts action items, decisions, and key discussion points from free-form meeting notes. Instead of manually tracking follow-ups after meetings, the AI analyzes the note content to identify commitments, deadlines, owners, and next steps — then offers to create corresponding activities and tasks automatically. This turns unstructured meeting notes into structured, actionable CRM data.
**Features:**
- AI-powered parsing of meeting notes to extract action items (who, what, by when)
- Detection of decisions made during the meeting and key discussion points
- One-click creation of follow-up activities from extracted action items, with due dates and assigned contacts
- Confidence scoring on each extracted item so users can review before committing
- Meeting note templates with AI-assisted structure (agenda, discussion, decisions, action items)
- Historical comparison: "Last meeting's action items — what was completed vs. overdue?"
- Summary generation: AI creates a concise executive summary of the meeting for sharing
- Export meeting notes as formatted documents (Markdown or PDF-ready HTML)
- Integration with Contact Activity Timeline: meeting notes appear as rich cards in the timeline
- Keyboard shortcut `Ctrl+M` to create a new meeting note for the currently viewed contact
- Dark theme support
**Implementation Approach:**
- New database table: `meeting_notes` (id, contact_id, lead_id, title, raw_content, ai_summary, extracted_items JSONB, created_at, updated_at)
- Backend endpoints: `GET/POST /api/meeting-notes`, `POST /api/meeting-notes/{id}/analyze`, `POST /api/meeting-notes/{id}/create-activities`, `GET /api/meeting-notes/{id}/summary`
- AI analysis: prompt construction using raw note content, contact context, and interaction history sent to existing AI integration endpoint
- Extracted items stored as JSONB array: [{type: "action_item"/"decision"/"key_point", text, owner, due_date, confidence}]
- Frontend: meeting note editor with split-pane view (raw notes on left, AI-extracted items on right)
- CSS styles: `.meeting-note-editor`, `.meeting-note-split-pane`, `.extracted-item`, `.action-item-card`, `.meeting-summary`, `.confidence-badge`
- Dark theme support
**Dependencies:** Contact Management (existing); Activity Tracking (existing); AI integration (existing infrastructure for lead recommendations); Contact Activity Timeline (Item 10 — implemented)

## Item 72: Contact Engagement Score and Health Monitoring
**Status:** Planned
**Description:** A composite engagement score that measures how actively each contact is engaging with your organization, providing a visual health indicator for every relationship. Unlike lead scoring (which predicts deal probability), engagement scoring measures the actual interaction velocity and quality — helping users identify at-risk relationships before they go cold and prioritize outreach to recently disengaged contacts.
**Features:**
- Composite engagement score (0-100) calculated from multiple weighted factors:
  - Recency of last interaction (30% weight)
  - Frequency of interactions over last 30/60/90 days (25% weight)
  - Diversity of interaction types — calls, emails, meetings, notes (20% weight)
  - Reciprocity ratio — did the contact respond or was it one-way (15% weight)
  - Trend direction — is engagement increasing, stable, or declining (10% weight)
- Visual health indicators on contact cards: 🟢 Healthy (70-100), 🟡 Cooling (40-69), 🔴 At Risk (0-39)
- Engagement score badge on contact cards alongside existing tag badges
- Engagement trend sparkline in contact detail view (last 90 days)
- "At Risk" filter on contacts page to surface disengaged contacts
- Dashboard stat card showing count of at-risk contacts
- Automated engagement alerts: notify when a VIP contact drops below a threshold
- Comparison view: "Top 10 Most Engaged" and "Top 10 Least Engaged" contacts
- Export engagement report as CSV (contact, score, trend, last contact, days since)
- Keyboard shortcut `Ctrl+H` to sort contacts by health score
- Dark theme support
**Implementation Approach:**
- Score computed client-side from existing activity data (no new database tables needed initially)
- Backend endpoint: `GET /api/contacts/{id}/engagement` returns score breakdown and trend data
- Backend endpoint: `GET /api/contacts/engagement-summary` returns at-risk count and top/bottom lists
- Frontend: engagement badge rendered on contact cards, trend sparkline in detail modal
- Sparkline: SVG-based mini chart (no external library) showing daily interaction count over 90 days
- Score calculation runs on contacts page load and caches results; re-computed after activity CRUD
- CSS styles: `.engagement-badge`, `.engagement-healthy`, `.engagement-cooling`, `.engagement-at-risk`, `.engagement-sparkline`, `.engagement-breakdown`
- Dark theme support
**Dependencies:** Contact Management (existing); Activity Tracking (existing); Contact Tags (Item 6 — implemented); Dashboard (existing)

## Item 73: Document and Attachment Management
**Status:** Planned
**Description:** A comprehensive document management system that allows users to attach files (PDFs, images, spreadsheets, contracts, proposals) to contacts, leads, and activities. Currently, AICRM has no way to store or reference supporting documents, which forces users to maintain files outside the CRM and breaks the single-source-of-truth model. This feature enables users to keep all relationship-relevant materials — signed contracts, meeting photos, product specs, proposals — directly within the CRM context.
**Features:**
- Upload files to contacts, leads, and activities via drag-and-drop or file picker
- Support for common file types: PDF, images (PNG/JPG/GIF), spreadsheets (CSV/XLSX), documents (DOCX/TXT), and presentations (PPTX)
- File preview for images and PDFs rendered inline within the detail modal
- File metadata display: name, size, type, upload date, and uploader
- File list rendered as a tab in contact/lead detail modals alongside activities and notes
- Delete attachments with confirmation dialog
- File size limit enforcement (configurable, default 10MB per file)
- File type validation with user-friendly error messages
- Attachment count badge on contact and lead cards (📎 N)
- Search attachments by filename within a contact's document list
- Download individual files or bulk-download all attachments as a ZIP
- AI-powered file insights: auto-extract document type and suggest relevant tags (e.g., "contract", "proposal", "invoice")
- Keyboard shortcut `Ctrl+A` to open file upload for the currently viewed contact
- Dark theme support
**Implementation Approach:**
- New database table: `attachments` (id, entity_type ENUM(contact,lead,activity), entity_id, filename, original_filename, mime_type, file_size, storage_path, uploaded_by, created_at)
- Files stored on disk in a configurable directory (e.g., `/data/attachments/`) with unique filenames to prevent collisions
- Backend endpoints: `POST /api/attachments/upload` (multipart form), `GET /api/attachments/{id}/download`, `DELETE /api/attachments/{id}`, `GET /api/{entity_type}/{entity_id}/attachments`
- File upload handled via FastAPI `UploadFile` with streaming writes to disk
- Frontend: drag-and-drop zone with visual feedback (highlight on drag-over), progress indicator during upload
- File preview: images rendered as `<img>` tags, PDFs rendered via `<iframe>` or `<object>` tag
- CSS styles: `.attachment-list`, `.attachment-item`, `.attachment-preview`, `.attachment-drop-zone`, `.attachment-badge`, `.attachment-file-icon`
- Dark theme support
**Dependencies:** Contact Management (existing); Lead Management (existing); Activity Tracking (existing)

## Item 74: Webhook Integrations and External Service Connectivity
**Status:** Planned
**Description:** A webhook system that allows AICRM to push real-time event notifications to external services (Slack, Discord, Zapier, custom APIs) when CRM events occur. This enables users to integrate AICRM into their existing workflows without building custom connectors. For example, when a lead reaches "won" stage, a notification can be sent to a Slack channel; when a new contact is added, a Zapier workflow can trigger email personalization. Combined with incoming webhook support, this creates a bidirectional integration layer.
**Features:**
- Configure webhook endpoints with URL, HTTP method, and optional authentication headers
- Event subscriptions: subscribe to specific CRM events (contact.created, contact.updated, lead.stage_changed, lead.converted, activity.completed, etc.)
- Webhook payload customization: choose which fields to include in the notification
- Retry policy: configurable retry count and backoff for failed deliveries (default: 3 retries with exponential backoff)
- Webhook delivery log: view history of all webhook deliveries with status, response code, and timestamp
- Test webhook button: send a sample payload to verify endpoint connectivity
- Secret-based signature verification: HMAC-SHA256 signature included in `X-AICRM-Signature` header for recipient verification
- Enable/disable webhooks without deletion
- Multiple webhooks per event type (fan-out to multiple services)
- Incoming webhook support: receive data from external tools to create contacts, leads, or activities
- AI-powered payload summarization: optional AI-generated summary of the change included in webhook payloads
- Dashboard widget showing webhook delivery success rate and recent failures
- Keyboard shortcut `Ctrl+W` to open webhook settings
- Dark theme support
**Implementation Approach:**
- New database tables: `webhooks` (id, name, url, method, event_types JSONB, headers JSONB, secret, retry_count, retry_backoff, enabled, created_at, updated_at) and `webhook_deliveries` (id, webhook_id, event_type, payload JSONB, status, http_status_code, response_body, retry_count, next_retry_at, created_at)
- Backend endpoints: `GET/POST /api/webhooks`, `PATCH /api/webhooks/{id}`, `DELETE /api/webhooks/{id}`, `POST /api/webhooks/{id}/test`, `GET /api/webhooks/{id}/deliveries`
- Async webhook dispatcher using FastAPI background tasks or a simple queue (e.g., asyncio.Queue with a worker coroutine)
- HMAC signature generation using the webhook secret and request body
- Incoming webhook endpoint: `POST /api/webhooks/incoming/{channel_id}` with JSON payload parsing and entity creation
- Frontend: webhook configuration form with event type checkboxes, header key-value pairs, and delivery log table
- CSS styles: `.webhook-config`, `.webhook-event-list`, `.webhook-delivery-log`, `.webhook-status-badge`, `.webhook-test-btn`
- Dark theme support
**Dependencies:** Contact Management (existing); Lead Management (existing); Activity Tracking (existing); Dashboard (existing)

## Item 75: Contact Communication Timeline View ✅ IMPLEMENTED
**Status:** Implemented (see also Items 10, 41, 66)
**Description:** A unified chronological timeline view for each contact that consolidates all interactions — calls, emails, meetings, notes, tasks, stage changes, and tag updates — into a single scrollable feed. This gives users a complete narrative of their relationship with a contact at a glance, replacing the need to cross-reference separate activity logs, contact notes, and lead history.
**Features:**
- ✅ Chronological timeline feed showing all contact interactions
- ✅ Each timeline entry shows: icon + type badge (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note, ✅ Task), timestamp, and content preview
- ✅ Timeline accessible from contact detail modal
- ✅ Activity count badge on contact cards
- ✅ Inline activity creation from the contact detail view (prefilled contact name)
- ✅ Dark theme support
- ⏳ Date-based grouping (Today, Yesterday, This Week, Older) — not yet implemented
- ⏳ Expandable entries with full details inline — not yet implemented
- ⏳ Activity type filter — not yet implemented
- ⏳ Quick-reply from timeline — not yet implemented
- ⏳ Visual connectors between related activities — not yet implemented
- ⏳ Empty state guidance — not yet implemented
- ⏳ Timeline summary header — not yet implemented
- ⏳ AI-powered conversation summary — not yet implemented
- ⏳ AI-suggested next step — not yet implemented
- ⏳ Keyboard shortcut `T` — not yet implemented
**Implementation Details:**
- See Items 10, 41, and 66 for full implementation details — this item is a duplicate entry for the same feature.
- `showContactTimeline(contactId)` in `app/js/app.js` renders a chronological timeline of all activities linked to a contact
- CSS classes: `.timeline-item`, `.timeline-marker`, `.timeline-dot`, `.timeline-content`, `.timeline-header`, `.timeline-date`
- Core timeline view is implemented; advanced features (grouping, filtering, search, AI summary, quick-reply, connectors) remain planned
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`
**Tests:** `docs/testing/test-communication-timeline.js`
**Dependencies:** Contact Management (existing); Activity Tracking (existing); Lead Management (existing)

## Item 76: Automated Lead Follow-Up Scheduler
**Status:** Planned
**Description:** An intelligent system that automatically schedules and reminds users to follow up with leads based on configurable rules, lead behavior, and AI-generated timing recommendations. Eliminates the risk of dropping leads through the cracks by ensuring every lead receives timely attention according to its priority and engagement level.
**Features:**
- Configurable follow-up cadence templates (e.g., "Standard Pipeline": Day 1 call, Day 3 email, Day 7 meeting, Day 14 proposal)
- Per-lead follow-up schedule visible on lead cards as upcoming milestones with countdown badges
- Auto-creation of follow-up activities when a lead enters a new stage or passes a deadline without engagement
- Smart delay: if a lead was recently contacted (within 24 hours), skip redundant follow-ups
- Priority-based scheduling: Critical/Hot leads get more aggressive follow-up cadences than Cold leads
- Follow-up history: track which scheduled follow-ups were completed, skipped, or missed
- Missed follow-up recovery: when a follow-up is missed, automatically reschedule for the next business day and flag as "Overdue Follow-Up"
- Bulk follow-up scheduling: select multiple leads and apply a cadence template to all at once
- Follow-up analytics on dashboard: % of scheduled follow-ups completed on time, average days between follow-ups, leads with no follow-up in 30+ days
- AI-optimized timing: analyze historical conversion data to recommend the optimal number of follow-ups and ideal intervals per lead segment
- AI-generated follow-up message drafts: pre-written contextual messages for each follow-up step, personalized with lead data
- Exclusion rules: automatically skip follow-ups for leads in Won/Lost stages or contacts marked as "Do Not Contact"
- Keyboard shortcut `F` to open follow-up scheduler for the selected lead
- Dark theme support
**Implementation Approach:**
- New database table: `follow_up_schedules` (id, lead_id, template_name, step_number, scheduled_date, status ENUM(pending,completed,skipped,missed,rescheduled), activity_id, notes, created_at) and `follow_up_templates` (id, name, steps JSONB, enabled, is_default)
- Backend endpoints: `GET /api/follow-ups/leads/{id}`, `POST /api/follow-ups/schedule`, `PATCH /api/follow-ups/{id}/complete`, `PATCH /api/follow-ups/{id}/skip`, `GET /api/follow-ups/templates`, `POST /api/follow-ups/bulk-schedule`, `GET /api/follow-ups/analytics`
- Background scheduler (runs every 5 minutes via FastAPI startup event): checks for due follow-ups, creates activities for pending items, marks overdue items as "missed"
- Frontend: `.follow-up-scheduler` modal with template selector, step-by-step timeline preview, and lead-specific overrides
- CSS styles: `.follow-up-scheduler`, `.follow-up-timeline`, `.follow-up-step`, `.follow-up-step-completed`, `.follow-up-step-overdue`, `.follow-up-countdown-badge`, `.follow-up-analytics-card`, `.follow-up-ai-suggestion`, `.follow-up-bulk-bar`
- AI timing optimization: periodic batch job that analyzes completed deals vs follow-up patterns to suggest optimal cadences
- Dark theme support
**Dependencies:** Lead Management (existing); Activity Tracking (existing); Lead Scoring (existing); Dashboard (existing)
