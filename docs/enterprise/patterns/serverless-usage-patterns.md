# Serverless Usage Patterns

## Recommended Uses
- asynchronous event processing
- scheduled maintenance tasks
- file transformation
- webhook fan-out
- low-volume APIs with simple logic
- proof-of-concept applications

## Discouraged Uses
- complex workflow orchestration
- central business systems
- heavy reporting systems
- applications with deep relational models
- systems with complex role and permission models

## Rule of Thumb
If the team is asking whether the main system backend should be FastAPI or Node.js versus serverless, the likely answer is that the main system should remain a traditional backend and serverless should be used only for supporting workloads.
