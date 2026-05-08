# ADR-0003 Primary Database Selection

## Status
Proposed

## Enterprise Default
The enterprise architecture documentation identifies the preferred relational database standard and approved default database direction for business applications.

## Application Decision
AICRM adopts the enterprise default primary database standard.
AICRM will use the enterprise-approved default relational database direction and will not request a database exception at this stage.

## Rationale
The application is moving away from browser-local persistence and toward an enterprise-aligned system of record. This ADR records conformance to the established enterprise database standard.

## Alternatives Considered
- No database exception requested at this stage
- Non-default managed data platforms are not being selected in this ADR

## Conformance / Exception Status
Conforms

## Related Enterprise Standards
- database selection standard
- approved products list
- ADR-0003 approved relational databases

## Next Implementation Impact
A future implementation step will define schema design, migrations, backup and recovery planning, and the removal of browser-local persistence as the system of record.
