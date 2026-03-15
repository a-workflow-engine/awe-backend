# Test Report

**Run date:** 2026-03-15T05:40:45.229Z
**Total:** 70 | **Passed:** 70 | **Failed:** 0 | **Pending:** 0
**Duration:** 12.14s

## tests\middlewares\auth.middleware.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| should authenticate bearer token | ✅ passed | 10 |  |
| should throw error if authorization header missing | ✅ passed | 13 |  |
| should authenticate api key | ✅ passed | 1 |  |
| should throw error for invalid authorization format | ✅ passed | 2 |  |

## tests\services\apiKey.service.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| should return api keys | ✅ passed | 15 |  |
| should throw error if actor is not organization | ✅ passed | 19 |  |
| should throw error if environment missing | ✅ passed | 1 |  |

## tests\controllers\task.controller.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| calls res.json with the task when a valid UUID is provided and task is found | ✅ passed | 6 |  |
| throws NotFoundError when task is not found | ✅ passed | 10 |  |
| throws ZodError when taskId is not a valid UUID | ✅ passed | 4 |  |
| throws ZodError when taskId param is missing | ✅ passed | 2 |  |
| propagates RepositoryError thrown by the service | ✅ passed | 3 |  |

## tests\services\auth.service.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| should login successfully | ✅ passed | 11 |  |
| should throw error if password incorrect | ✅ passed | 23 |  |
| should throw error if user not found | ✅ passed | 3 |  |
| should generate new tokens using refresh token | ✅ passed | 2 |  |

## tests\engine\ExecutionEngine.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| happy path: start node COMPLETED, end node COMPLETED → instance status becomes completed | ✅ passed | 16 |  |
| nodeService throws → error propagates out of start() | ✅ passed | 34 |  |
| StartNodeExecutor returns FAILED → instanceRepository.updateById called with status failed | ✅ passed | 3 |  |
| StartNodeExecutor throws → treated as FAILED, instanceRepository.updateById called with failed | ✅ passed | 2 |  |
| no outgoing edges from start node → instance marked FAILED | ✅ passed | 1 |  |
| EndNodeExecutor returns FAILED → instanceRepository.updateById called with status failed | ✅ passed | 1 |  |
| EndNodeExecutor returns COMPLETED → instanceRepository.updateById called with status completed | ✅ passed | 1 |  |
| next node has no registered executor → StateTransitionError propagates | ✅ passed | 20 |  |
| edgeResolver throws StateTransitionError (broken decision) → instance marked FAILED | ✅ passed | 11 |  |
| taskRepository.insert is called once for start node and once for end node | ✅ passed | 1 |  |
| taskExecutionRepository.insert is called twice (once per node) | ✅ passed | 1 |  |
| constants from start node output are merged into current_variables before advancing | ✅ passed | 1 |  |

## tests\controllers\system.controller.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| should register system | ✅ passed | 6 |  |

## tests\controllers\auth.controller.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| should login successfully | ✅ passed | 6 |  |

## tests\controllers\apiKey.controller.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| should list api keys | ✅ passed | 7 |  |
| should generate new api key | ✅ passed | 2 |  |

## tests\engine\executors\EndNodeExecutor.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| evaluates resultMap FEEL expressions and returns COMPLETED with correct outputVariables | ✅ passed | 15 |  |
| returns FAILED when configuration.success is false even when FEEL evaluation succeeds | ✅ passed | 1 |  |
| returns FAILED when FEEL expression produces evaluation warnings | ✅ passed | 4 |  |
| returns COMPLETED when validationExpression evaluates to true | ✅ passed | 4 |  |
| returns FAILED when validationExpression evaluates to false | ✅ passed | 3 |  |
| returns COMPLETED with empty outputVariables when resultMap is empty | ✅ passed | 2 |  |
| throws DataIntegrityError when node configuration is invalid | ✅ passed | 16 |  |
| evaluates FEEL null literal to null without crashing | ✅ passed | 2 |  |

## tests\engine\executors\StartNodeExecutor.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| maps constants correctly from instanceInputVariables | ✅ passed | 9 |  |
| puts input field with fetchableId into fetchables, not constants | ✅ passed | 15 |  |
| evaluates FEEL urlExpression and stores the result in urls keyed by fetchable id | ✅ passed | 4 |  |
| returns COMPLETED with empty maps when inputDataMap and fetchables are empty | ✅ passed | 2 |  |
| throws DataIntegrityError when node configuration is invalid | ✅ passed | 17 |  |
| throws DataIntegrityError when FEEL URL expression evaluates to a non-string | ✅ passed | 4 |  |
| ignores _context and _transaction params and still returns COMPLETED | ✅ passed | 2 |  |

## tests\services\task.service.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| returns the task when repository resolves with a task | ✅ passed | 4 |  |
| returns undefined when repository resolves with undefined | ✅ passed | 1 |  |
| propagates RepositoryError thrown by the repository | ✅ passed | 16 |  |

## tests\engine\ContextManager.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| returns empty global and next scopes | ✅ passed | 4 |  |
| merges into GLOBAL scope and leaves next untouched | ✅ passed | 2 |  |
| merges into NEXT scope and leaves global untouched | ✅ passed | 2 |  |
| does not mutate the original context object | ✅ passed | 1 |  |
| flattens global and next into one object | ✅ passed | 1 |  |
| next scope values shadow global scope values for the same key | ✅ passed | 1 |  |
| empties next and preserves global | ✅ passed | 1 |  |
| does not mutate the original context | ✅ passed | 0 |  |
| returns correct WorkflowContext from well-formed JSON | ✅ passed | 2 |  |
| returns empty scopes when input is null | ✅ passed | 5 |  |
| defaults global to empty object when key is missing | ✅ passed | 1 |  |

## tests\engine\EdgeResolver.test.ts

| Test Case | Status | Duration (ms) | Error |
|-----------|--------|---------------|-------|
| returns the destination id for a single outgoing edge | ✅ passed | 5 |  |
| returns all destination ids for multiple outgoing edges | ✅ passed | 2 |  |
| returns empty array when there are no outgoing edges | ✅ passed | 1 |  |
| excludes edges with null destination_node_id | ✅ passed | 2 |  |
| treats completedNodeId not found in nodes as a non-decision node | ✅ passed | 0 |  |
| returns destination of matching conditional edge | ✅ passed | 11 |  |
| falls back to default edge when no condition matches | ✅ passed | 3 |  |
| throws StateTransitionError when no condition matches and no default edge | ✅ passed | 25 |  |
| returns all destinations when multiple conditions match | ✅ passed | 4 |  |
