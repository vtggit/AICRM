# AICRM - Future Enhancements - Always consider AI inclusion in every enhancement

## Priority 1: Contact Import/Export with CSV Support ✅ IMPLEMENTED
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

## Priority 2: Lead Scoring System ✅ IMPLEMENTED
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

## Priority 3: Email Templates ✅ IMPLEMENTED
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
- Templates stored in localStorage under `aicrm_templates`
- Each template has: id, name, category, subject, body, createdAt
- Variable chips are clickable spans that insert the variable at the cursor position in the textarea
- Preview text replaces `{{variable}}` patterns with `[var]` for readability
- Navigation includes dedicated Templates page with full CRUD UI
**Files Modified:** `app/index.html`, `app/js/app.js`, `app/css/styles.css`, `app/js/storage.js`
**Tests:** `docs/testing/test-email-templates.js` (10/10 passed)

## Priority 4: Calendar Integration
**Status:** Planned
**Description:** Add calendar view for scheduling and viewing upcoming meetings, calls, and tasks.
**Features:**
- Monthly and weekly calendar views
- Activity scheduling with reminders
- Conflict detection
- Export to iCalendar format

## Priority 5: Advanced Reporting Dashboard
**Status:** Planned
**Description:** Comprehensive analytics and reporting features for tracking CRM performance.
**Features:**
- Conversion rate tracking
- Revenue forecasting based on pipeline
- Activity trend charts
- Custom date range filtering

## Priority 6: Tags and Custom Fields
**Status:** Planned
**Description:** Allow users to add custom tags and fields to contacts and leads for better organization.
**Features:**
- Multi-tag support with color coding
- Custom field creation (text, number, date, select)
- Filter by tags
- Tag-based grouping

## Priority 7: Activity Reminders and Notifications
**Status:** Planned
**Description:** Browser-based notifications for upcoming activities and follow-up reminders.
**Features:**
- Configurable reminder times
- Browser notification API integration
- Overdue activity alerts
- Daily digest of upcoming tasks

## Priority 8: Multi-User Support
**Status:** Planned
**Description:** Support for multiple user accounts with role-based access control.
**Features:**
- User registration and authentication
- Role-based permissions (admin, manager, sales)
- Activity ownership tracking
- Shared contact management

## Priority 9: Bulk Contact Operations
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
- Operations execute client-side with batch localStorage updates
- Toast notification showing count of affected records
**Dependencies:** Contact Management (Priority 0 - existing)

## Priority 10: Contact Activity History Timeline
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
**Dependencies:** Contact Management, Activity Tracking (both Priority 0 - existing)

## Priority 11: Lead CSV Export/Import ✅ IMPLEMENTED
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

## Priority 12: Dashboard Revenue Summary ✅ IMPLEMENTED
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
**Dependencies:** Lead Management (Priority 0 - existing)

## Priority 13: Quick Activity Logging from Cards
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
**Dependencies:** Contact Management, Lead Management, Activity Tracking (all Priority 0 - existing)

## Priority 14: Dashboard Recent Items
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
**Dependencies:** Contact Management, Lead Management (both Priority 0 - existing)

## Priority 15: AI-Powered Lead Recommendations
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
**Dependencies:** Lead Scoring (Priority 2 - implemented), Activity Tracking (Priority 0 - existing)

## Priority 16: Dashboard PDF Report Export
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
**Dependencies:** Dashboard (Priority 0 - existing), Dashboard Revenue Summary (Priority 12 - implemented)

## Priority 17: Contact Duplicate Detection
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
**Dependencies:** Contact Management (Priority 0 - existing)

## Priority 18: Keyboard Shortcuts
**Status:** Planned
**Description:** Add global keyboard shortcuts for power users to navigate and perform common actions faster without reaching for the mouse, improving productivity and accessibility.
**Features:**
- Global shortcut `/` to focus the search bar (works from any page)
- `Ctrl+N` or `Cmd+N` to open "New Contact" modal
- `Ctrl+L` or `Cmd+L` to open "New Lead" modal
- `Ctrl+A` or `Cmd+A` (when not in text input) to open "New Activity" modal
- `1-5` to navigate to Dashboard, Contacts, Leads, Activities, Settings respectively
- `Escape` to close modals (already implemented)
- `Ctrl+E` to export current page data as CSV
- Visual shortcut hints displayed in a help modal (accessible via `?` key)
- Shortcuts disabled when user is actively typing in a text field
**Implementation Approach:**
- Add a `bindKeyboardShortcuts()` method in `App.init()` that registers a global `keydown` listener
- Check `e.target.tagName` to avoid triggering shortcuts during text input (except for `/` and `Escape`)
- Use `e.preventDefault()` to prevent default browser behavior for captured shortcuts
- Create a "Keyboard Shortcuts" help modal showing all available shortcuts in a clean table
- Store shortcut preference (enabled/disabled) in settings
- Add a small keyboard icon in the header that opens the shortcuts help modal
**Dependencies:** None — builds on existing navigation and modal system

## Priority 19: Contact Import from vCard (vCard/VCF Support)
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
**Dependencies:** Contact Management (Priority 0 - existing), Contact CSV Import/Export (Priority 1 - implemented)

## Priority 20: Activity Due Date Tracking and Overdue Alerts
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
- Add `dueDate` and `completed` fields to activity data model in localStorage
- Extend activity modal form with conditional date/time picker fields (shown only for Task and Meeting types)
- Add `isOverdue()` helper that compares dueDate with current timestamp
- Add overdue CSS styling (`.activity-item.overdue` with red left border and badge)
- Add "Overdue" option to `#activity-filter-type` dropdown and "Due Date (Soonest)" to sort dropdown
- Add overdue count to dashboard alongside today's activities stat
- Reuse existing activity CRUD infrastructure with extended fields
**Dependencies:** Activity Tracking (Priority 0 - existing)