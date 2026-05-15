# Documentation Standards for AICRM

## Purpose
This document defines documentation standards for the AICRM project to ensure consistency, clarity, and maintainability across all documentation artifacts.

## Documentation Structure

```
docs/
├── README.md                      # Project overview and specification
├── DOCUMENTATION_STANDARD.md      # This file
├── product/
│   └── core-requirements.md       # Core feature requirements
├── roadmap/
│   └── future-enhancements.md     # Planned features and priorities
├── operations/
│   ├── known-issues.md            # Current bugs and issues
│   └── session_tracking.md        # Session handoff notes
└── testing/
    ├── verify-core-features.js    # Core feature verification tests
    ├── test-csv-import-export.js  # CSV import/export tests
    ├── test-lead-scoring.js       # Lead scoring system tests
    ├── test-revenue-summary.js    # Dashboard revenue summary tests
    ├── test-lead-csv.js       # Lead CSV export/import tests
    ├── test-email-templates.js  # Email templates feature tests
    ├── test-ai-recommendations.js  # AI-Powered Lead Recommendations tests
    ├── test-keyboard-shortcuts.js  # Keyboard shortcuts tests
    ├── test-backup-restore.js      # Data Backup and Restore tests
    ├── test-activity-due-date-tracking.js  # Activity Due Date Tracking tests
    ├── test-quick-activity-logging.js  # Quick Activity Logging from Contact Cards tests
    ├── test-activity-reminders.js      # Activity Reminders and Notifications tests
    ├── test-pdf-export.js             # Dashboard PDF Report Export tests
    └── test-*.js                  # Feature-specific tests
```

## Documentation File Standards

### README.md (Project Specification)
- Project name, description, and purpose
- Technology stack and dependencies
- Setup and installation instructions
- Architecture overview
- Project milestones and current status

### Core Requirements (`product/core-requirements.md`)
- Each feature listed with acceptance criteria
- Status tracking: ✅ Complete, 🔄 In Progress, ⏳ Not Started
- Feature categories: Core, Enhancement, Nice-to-Have

### Future Enhancements (`roadmap/future-enhancements.md`)
- Features organized by priority (Priority 1 = highest)
- Each feature includes: description, implementation approach, dependencies
- Status tracking: ✅ Implemented, 📋 Planned, 🔍 Under Review

### Known Issues (`operations/known-issues.md`)
- Issue title and severity (Critical, High, Medium, Low)
- Description of the issue and steps to reproduce
- Status: 🐛 Open, 🔧 In Progress, ✅ Fixed
- Resolution notes when fixed

### Session Tracking (`operations/session_tracking.md`)
- Session identifier and timestamp
- Agent role and objectives
- Work completed, issues encountered, and next steps
- Critical context for the next agent

## Writing Standards

### General Guidelines
1. **Be specific** - Avoid vague descriptions; include concrete details
2. **Use consistent formatting** - Follow the templates below
3. **Update status promptly** - Mark items as complete/in-progress as work happens
4. **Include context** - Explain why decisions were made, not just what was done
5. **Keep it current** - Remove outdated information during each session

### Formatting Conventions
- Use Markdown headers (`#`, `##`, `###`) for hierarchy
- Use emoji status indicators: ✅ 🔄 ⏳ 🐛 🔧
- Use code blocks for code snippets, commands, and file paths
- Use tables for structured data (features, issues, test results)
- Keep lines under 120 characters where possible

### Status Indicators
| Emoji | Meaning |
|-------|---------|
| ✅ | Complete / Working |
| 🔄 | In Progress |
| ⏳ | Not Started / Planned |
| 🐛 | Bug / Issue |
| 🔧 | Being Fixed |
| 🔍 | Under Review |
| ⚠️ | Warning / Attention Needed |

### Feature Documentation Template
```markdown
### Feature: [Feature Name]
- **Priority**: [Priority 1-5]
- **Status**: [Status emoji + label]
- **Description**: [What it does]
- **Implementation**: [How it works technically]
- **Files Modified**: [List of affected files]
- **Tests**: [Test file and results]
- **Dependencies**: [Any prerequisites]
```

### Issue Documentation Template
```markdown
### [Issue Title]
- **Severity**: [Critical/High/Medium/Low]
- **Status**: [Status emoji + label]
- **Description**: [What's wrong]
- **Steps to Reproduce**: [How to trigger]
- **Expected Behavior**: [What should happen]
- **Actual Behavior**: [What does happen]
- **Resolution**: [How it was fixed, if applicable]
```

### Session Summary Template
```markdown
## Session [N] - [YYYY-MM-DD HH:MM]
**Agent Role**: [Role]
**Tasks Completed**:
- [Task 1]
- [Task 2]
**Issues Encountered**:
- [Issue description + resolution]
**Next Steps**:
- [What the next agent should do]
```

## Review Process
- Each session agent should review and update all documentation before starting work
- Known issues should be checked before implementing new features
- Session tracking should be updated at the end of each session
- Future enhancements should be prioritized and updated as features are implemented