# User Journeys

## Purpose

This document maps the primary user journeys in AICRM and identifies gaps in the current experience.

## Current State

### Journey 1: Managing a New Lead

1. User navigates to the Leads page.
2. Clicks "Add Lead" and fills in the lead form (name, company, email, phone, source, stage, value).
3. Lead score is auto-calculated based on provided information.
4. Lead appears in the pipeline view.
5. User can later update the stage, log activities, or convert the lead.

### Journey 2: Tracking Activities

1. User navigates to the Activities page.
2. Clicks "Add Activity" and selects type (call, email, meeting, note, task).
3. Enters description, date, and optionally associates with a contact or lead.
4. Activity appears in the timeline view.
5. Overdue activities are flagged with a badge on the navigation.

### Journey 3: Backing Up Data

1. User navigates to Settings.
2. Clicks "Create Backup" to download a JSON file.
3. To restore, clicks "Restore from Backup" and selects a previously saved JSON file.

## Gaps

- No onboarding journey for new users.
- No guided workflow for lead-to-contact conversion.
- No journey for team collaboration or data sharing.
- No recovery journey if browser data is lost (beyond manual restore).
- No search-and-discovery journey for finding specific records.

## Target Direction

The target user journeys will include:

- Onboarding flow with guided setup and sample data.
- Lead conversion workflow with data carryover to contacts.
- Team collaboration journeys (sharing, assigning, commenting).
- Automated backup and recovery with user notifications.
- Advanced search and filter journeys with saved views.
- Multi-device synchronization and seamless handoff.

## Related Enterprise Standards

- Enterprise UX journey mapping guidelines
- User onboarding standards
- Customer experience (CX) requirements
