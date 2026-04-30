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
- Export all data as JSON file
- Import data from JSON file
- Clear all data with double confirmation
- Data persistence via localStorage

### 7. Theme Toggle (COMPLETED)
- Light and dark theme support
- Theme preference persisted in localStorage
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

## Technical Requirements
- Single Page Application (SPA) architecture
- localStorage for data persistence
- No server dependencies
- Modern browser support (ES6+)
- Semantic HTML with ARIA labels
- XSS protection via HTML escaping
