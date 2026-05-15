# AICRM - Core Requirements

## Product Overview
AICRM is a modern, AI First, Customer Relationship Management (CRM) web application that helps businesses manage contacts, leads, and activities. AI inclusion is considered in every enhancement.

## Core Features

### 1. Dashboard (COMPLETED)
- Statistics overview (total contacts, leads, converted leads, today's activities)
- Recent activities feed
- Lead pipeline visualization showing counts per stage
- Responsive layout with stat cards

### 2. Contact Management (COMPLETED)
- Create, Read, Update, Delete (CRUD) contacts
- Contact fields: name, email, phone, company, status, notes
- Status options: Active, Inactive, VIP
- Filter by status
- Sort by name (A-Z, Z-A) or most recent
- Card-based contact display with action buttons

### 3. Lead Management (COMPLETED)
- Create, Read, Update, Delete (CRUD) leads
- Lead fields: name, company, email, phone, estimated value, stage, source, notes
- Pipeline stages: New, Contacted, Qualified, Proposal, Won, Lost
- Lead sources: Website, Referral, Social Media, Cold Call, Event
- Filter by stage
- Sort by most recent or estimated value
- Card-based lead display with value highlighting

### 4. Activity Tracking (COMPLETED)
- Create and delete activities
- Activity types: Call, Email, Meeting, Note, Task
- Link activities to contacts
- Custom date/time selection
- Timeline view with chronological ordering
- Filter by activity type

### 5. Global Search (COMPLETED)
- Real-time search across contacts and leads
- Searches name, email, company, and source fields
- Auto-navigates to relevant results page
- Debounced input (300ms)

### 6. Data Management (COMPLETED)
- Export Contacts and Leads as CSV files (client-side convenience only)
- Import Contacts and Leads from CSV files
- Full data backup and recovery handled at the PostgreSQL level (e.g. `pg_dump`)
- All business data persisted in PostgreSQL via backend APIs

### 7. Theme Toggle (COMPLETED)
- Light and dark theme support
- Theme preference persisted in sessionStorage
- Toggle button in header

### 8. Responsive Design (COMPLETED)
- Mobile-friendly sidebar with hamburger menu
- Responsive grid layouts
- Touch-friendly interaction elements

### 9. CSV Import/Export (COMPLETED)
- Export all contacts to CSV file with headers (Name, Email, Phone, Company, Status, Notes)
- Import contacts from CSV file with proper parsing (handles quoted fields, escaped quotes)
- Toast notification system for success/error feedback
- Import skips empty rows and reports count of imported vs. skipped records
- Export generates timestamped filename (contacts_YYYY-MM-DD.csv)
- Proper CSV escaping for special characters and commas in field values

### 10. Lead CSV Export/Import (COMPLETED)
- Export all leads to CSV file with headers (Name, Company, Email, Phone, Value, Stage, Source, Notes)
- Import leads from CSV file with proper parsing (handles quoted fields, escaped quotes)
- Toast notification system for success/error feedback
- Import validates stage values (invalid stages default to "new") and source values (invalid sources cleared)
- Import skips rows without a name and reports count of imported vs. skipped records
- Export generates timestamped filename (leads_YYYY-MM-DD.csv)
- Proper CSV escaping for special characters and commas in field values
- Dashboard stats updated after import

### 11. Dashboard Revenue Summary (COMPLETED)
- Total Pipeline Value stat card (sum of active lead values, excludes won/lost)
- Won Revenue stat card (sum of all won lead values)
- Average Deal Size calculation (won revenue / won lead count, $0.00 if none)
- Per-stage revenue breakdown displayed in pipeline overview alongside lead counts
- Currency formatting using Intl.NumberFormat with USD locale
- Revenue cards styled with green left border for visual distinction
- Revenue calculated dynamically on dashboard render (not stored)

### 12. Email Templates (COMPLETED)
- Create, edit, and delete reusable email templates
- Template fields: name, category, subject, body
- Category options: Sales, Support, Follow-up, Onboarding, Newsletter
- Variable substitution: {{first_name}}, {{last_name}}, {{company}}, {{email}}, {{phone}}
- Filter by category
- Toast notifications for save/delete operations

### 13. AI-Powered Lead Recommendations (COMPLETED)
- Dashboard card showing prioritized lead recommendations
- Scores active leads using existing lead scoring algorithm (0-100)
- Detects stale leads (14+ days = urgent, 7-13 days = high priority)
- Context-aware suggestions based on lead stage
- Maximum 3 recommendations displayed, sorted by score
- Click-to-navigate to individual leads

### 14. Keyboard Shortcuts (COMPLETED)
- Number keys (1-5) navigate to Dashboard, Contacts, Leads, Activities, Templates
- `/` focuses global search bar
- `?` opens keyboard shortcuts help modal
- `Ctrl+N` opens new contact modal
- `Ctrl+L` opens new lead modal
- `Ctrl+E` exports current page to CSV
- `Escape` closes modals
- Shortcuts disabled while typing in input fields (except `/`, `?`, `Escape`)
- Keyboard icon button in header opens shortcuts help modal

### 15. Activity Due Date Tracking (COMPLETED)
- Optional due date field on activity creation/edit forms (date input)
- Overdue activities highlighted with red left border and red timeline dot
- Overdue due dates displayed with ⚠️ warning icon and red text
- Overdue activities automatically sorted to the top of the timeline
- Overdue count badge displayed on Activities navigation item
- Dashboard stat card showing total overdue activities count
- Status filter dropdown with options: All, Overdue, Completed, Active
- Mark complete button (✅) on each activity card
- Completed activities displayed with strikethrough text and reduced opacity
- Completed activities hidden from overdue count and overdue filter
- Due date tracking persisted in PostgreSQL with activity data

### 16. Contact Tags (COMPLETED)
- Manage Tags modal accessible from Contacts page ("Manage Tags" button)
- Tag CRUD operations: create, edit, delete tags via modal UI
- Each tag has a name (unique, required) and color (hex color code, default: #6b7280)
- New tag creation via "+ New Tag" button revealing inline form (name input + color picker)
- Tag list displays all tags with colored indicator dot, name, and delete button
- Tag assignment in contact edit form: checkbox selector listing all available tags with color dots
- Selected tags pre-populated when editing existing contact (async API fetch)
- Tag badges rendered on contact cards showing colored dot + tag name
- Tags persist via backend API (`/api/tags` CRUD + `tag_ids` in contact create/update payload)
- Tags pre-selected when re-editing a contact
- Backend: `contact_tags` and `contact_tag_mapping` tables in PostgreSQL
- Dark theme support for all tag UI components

## Technical Requirements
- Single Page Application (SPA) frontend architecture
- Backend-owned data: FastAPI + PostgreSQL for all business domains
- JWT authentication (development shared token or production JWKS)
- Role-based authorization (admin/user)
- Audit logging for all domain mutations
- Modern browser support (ES6+)
- Semantic HTML with ARIA labels
- XSS protection via HTML escaping
