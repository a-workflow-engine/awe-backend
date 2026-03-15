# Test Report

| | |
|---|---|
| **Run date** | 2026-03-15T06:45:59.565Z |
| **Duration** | 31.60s |
| **Total** | 105 |
| **Passed** | 105 |
| **Failed** | 0 |
| **Pending** | 0 |
| **Overall** | ✅ PASS |

## ✅ tests\engine\ExecutionEngine.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| start node COMPLETED → outcome 'next' with nextNodeIds | ExecutionEngine › runNode() › start node COMPLETED → outcome 'next' with nextNodeIds | — | As expected | ✅ PASS | — | 24ms |
| end node COMPLETED → outcome 'completed', instance status completed | ExecutionEngine › runNode() › end node COMPLETED → outcome 'completed', instance status completed | — | As expected | ✅ PASS | — | 1ms |
| executor returns FAILED → outcome 'failed', instanceRepository.updateById called with FAILED | ExecutionEngine › runNode() › executor returns FAILED → outcome 'failed', instanceRepository.updateById called with FAILED | FAILED → outcome 'failed', instanceRepository.updateById called with FAILED | As expected | ✅ PASS | — | 10ms |
| executor throws → treated as FAILED, outcome 'failed' | ExecutionEngine › runNode() › executor throws → treated as FAILED, outcome 'failed' | throws → treated as FAILED, outcome 'failed' | As expected | ✅ PASS | — | 2ms |
| nodeId not found in workflow version → throws DataIntegrityError | ExecutionEngine › runNode() › nodeId not found in workflow version → throws DataIntegrityError | throws DataIntegrityError | As expected | ✅ PASS | — | 15ms |
| node type has no registered executor → throws StateTransitionError | ExecutionEngine › runNode() › node type has no registered executor → throws StateTransitionError | throws StateTransitionError | As expected | ✅ PASS | — | 1ms |
| no outgoing edges → outcome 'failed' | ExecutionEngine › runNode() › no outgoing edges → outcome 'failed' | — | As expected | ✅ PASS | — | 1ms |
| end node FAILED → outcome 'failed' | ExecutionEngine › runNode() › end node FAILED → outcome 'failed' | — | As expected | ✅ PASS | — | 1ms |
| edgeResolver throws StateTransitionError → outcome 'failed' | ExecutionEngine › runNode() › edgeResolver throws StateTransitionError → outcome 'failed' | throws StateTransitionError → outcome 'failed' | As expected | ✅ PASS | — | 1ms |
| taskRepository.insert is called once per runNode call | ExecutionEngine › runNode() › taskRepository.insert is called once per runNode call | — | As expected | ✅ PASS | — | 1ms |
| taskExecutionRepository.insert is called once per runNode call | ExecutionEngine › runNode() › taskExecutionRepository.insert is called once per runNode call | — | As expected | ✅ PASS | — | 1ms |
| constants from start node output are merged into context returned in 'next' outcome | ExecutionEngine › runNode() › constants from start node output are merged into context returned in 'next' outcome | — | As expected | ✅ PASS | — | 2ms |

## ✅ tests\services\instance.service.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| inserts instance, enqueues start node job, and returns instance | instanceService › createNew() › inserts instance, enqueues start node job, and returns instance | instance | As expected | ✅ PASS | — | 16ms |
| throws NotFoundError when no active workflow version exists | instanceService › createNew() › throws NotFoundError when no active workflow version exists | throws NotFoundError when no active workflow version exists | As expected | ✅ PASS | — | 27ms |
| enqueues job with the start node ID from the workflow version | instanceService › createNew() › enqueues job with the start node ID from the workflow version | job enqueued | As expected | ✅ PASS | — | 1ms |
| returns instance when found | instanceService › getById() › returns instance when found | instance | As expected | ✅ PASS | — | 1ms |
| returns undefined when not found | instanceService › getById() › returns undefined when not found | undefined | As expected | ✅ PASS | — | 1ms |
| throws NotFoundError when instance does not exist | instanceService › resumeInstance() › throws NotFoundError when instance does not exist | throws NotFoundError when instance does not exist | As expected | ✅ PASS | — | 2ms |
| throws StateTransitionError when instance is not paused | instanceService › resumeInstance() › throws StateTransitionError when instance is not paused | throws StateTransitionError when instance is not paused | As expected | ✅ PASS | — | 2ms |
| throws DataIntegrityError when no completed task found | instanceService › resumeInstance() › throws DataIntegrityError when no completed task found | throws DataIntegrityError when no completed task found | As expected | ✅ PASS | — | 1ms |
| enqueues next nodes and updates instance to IN_PROGRESS for paused instance | instanceService › resumeInstance() › enqueues next nodes and updates instance to IN_PROGRESS for paused instance | job enqueued | As expected | ✅ PASS | — | 3ms |
| enqueues multiple next nodes when edge resolver returns multiple IDs | instanceService › resumeInstance() › enqueues multiple next nodes when edge resolver returns multiple IDs | multiple IDs | As expected | ✅ PASS | — | 1ms |

## ✅ tests\controllers\instance.controller.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| returns 201 with created instance | instanceController › create() › returns 201 with created instance | 201 with created instance | As expected | ✅ PASS | — | 16ms |
| throws ZodError when workflowId is not a UUID | instanceController › create() › throws ZodError when workflowId is not a UUID | throws ZodError when workflowId is not a UUID | As expected | ✅ PASS | — | 18ms |
| propagates NotFoundError when no active workflow version found | instanceController › create() › propagates NotFoundError when no active workflow version found | error propagated | As expected | ✅ PASS | — | 3ms |
| returns instance when found | instanceController › getById() › returns instance when found | instance | As expected | ✅ PASS | — | 1ms |
| throws NotFoundError when instance not found | instanceController › getById() › throws NotFoundError when instance not found | throws NotFoundError when instance not found | As expected | ✅ PASS | — | 3ms |
| throws ZodError when instanceId is not a valid UUID | instanceController › getById() › throws ZodError when instanceId is not a valid UUID | throws ZodError when instanceId is not a valid UUID | As expected | ✅ PASS | — | 2ms |
| returns updated instance when resume succeeds | instanceController › resumeInstance() › returns updated instance when resume succeeds | updated instance | As expected | ✅ PASS | — | 2ms |
| throws ZodError when instanceId is not a valid UUID | instanceController › resumeInstance() › throws ZodError when instanceId is not a valid UUID | throws ZodError when instanceId is not a valid UUID | As expected | ✅ PASS | — | 6ms |
| propagates StateTransitionError when instance is not paused | instanceController › resumeInstance() › propagates StateTransitionError when instance is not paused | error propagated | As expected | ✅ PASS | — | 2ms |
| propagates NotFoundError when instance does not exist | instanceController › resumeInstance() › propagates NotFoundError when instance does not exist | error propagated | As expected | ✅ PASS | — | 2ms |

## ✅ tests\services\apiKey.service.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| should return api keys | ApiKey Service › should return api keys | api keys | As expected | ✅ PASS | — | 3ms |
| should throw error if actor is not organization | ApiKey Service › should throw error if actor is not organization | throws error if actor is not organization | As expected | ✅ PASS | — | 65ms |
| should throw error if environment missing | ApiKey Service › should throw error if environment missing | throws error if environment missing | As expected | ✅ PASS | — | 6ms |

## ✅ tests\engine\queue\BullMQWorker.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| registers a 'failed' event listener on the worker | ExecutionWorker › constructor › registers a 'failed' event listener on the worker | — | As expected | ✅ PASS | — | 56ms |
| passes concurrency: 10 to the BullMQ Worker | ExecutionWorker › constructor › passes concurrency: 10 to the BullMQ Worker | — | As expected | ✅ PASS | — | 2ms |
| skips processing when instance is not found | ExecutionWorker › processJob() › skips processing when instance is not found | processing skipped | As expected | ✅ PASS | — | 8ms |
| skips processing when instance status is not in_progress | ExecutionWorker › processJob() › skips processing when instance status is not in_progress | processing skipped | As expected | ✅ PASS | — | 1ms |
| calls executionEngine.runNode with correct args when instance is in_progress | ExecutionWorker › processJob() › calls executionEngine.runNode with correct args when instance is in_progress | executionEngine.runNode with correct args when instance is in_progress called | As expected | ✅ PASS | — | 1ms |
| enqueues next nodes when outcome is 'next' and auto_advance is true | ExecutionWorker › processJob() › enqueues next nodes when outcome is 'next' and auto_advance is true | job enqueued | As expected | ✅ PASS | — | 3ms |
| marks instance as PAUSED when outcome is 'next' and auto_advance is false | ExecutionWorker › processJob() › marks instance as PAUSED when outcome is 'next' and auto_advance is false | status updated | As expected | ✅ PASS | — | 1ms |
| does not enqueue next nodes when outcome is 'completed' | ExecutionWorker › processJob() › does not enqueue next nodes when outcome is 'completed' | job enqueued | As expected | ✅ PASS | — | 1ms |
| does not enqueue next nodes when outcome is 'failed' | ExecutionWorker › processJob() › does not enqueue next nodes when outcome is 'failed' | job enqueued | As expected | ✅ PASS | — | 1ms |
| calls worker.close() | ExecutionWorker › close() › calls worker.close() | worker.close() called | As expected | ✅ PASS | — | 2ms |

## ✅ tests\services\auth.service.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| should login successfully | Auth Service › should login successfully | — | As expected | ✅ PASS | — | 5ms |
| should throw error if password incorrect | Auth Service › should throw error if password incorrect | throws error if password incorrect | As expected | ✅ PASS | — | 36ms |
| should throw error if user not found | Auth Service › should throw error if user not found | throws error if user not found | As expected | ✅ PASS | — | 1ms |
| should generate new tokens using refresh token | Auth Service › should generate new tokens using refresh token | — | As expected | ✅ PASS | — | 5ms |

## ✅ tests\middlewares\auth.middleware.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| should authenticate bearer token | Auth Middleware › should authenticate bearer token | — | As expected | ✅ PASS | — | 5ms |
| should throw error if authorization header missing | Auth Middleware › should throw error if authorization header missing | throws error if authorization header missing | As expected | ✅ PASS | — | 54ms |
| should authenticate api key | Auth Middleware › should authenticate api key | — | As expected | ✅ PASS | — | 1ms |
| should throw error for invalid authorization format | Auth Middleware › should throw error for invalid authorization format | throws error for invalid authorization format | As expected | ✅ PASS | — | 13ms |

## ✅ tests\controllers\auth.controller.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| should login successfully | Auth Controller › should login successfully | — | As expected | ✅ PASS | — | 7ms |

## ✅ tests\controllers\apiKey.controller.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| should list api keys | API Key Controller › should list api keys | — | As expected | ✅ PASS | — | 5ms |
| should generate new api key | API Key Controller › should generate new api key | — | As expected | ✅ PASS | — | 1ms |

## ✅ tests\controllers\system.controller.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| should register system | System Controller › should register system | — | As expected | ✅ PASS | — | 13ms |

## ✅ tests\services\task.service.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| returns the task when repository resolves with a task | taskService › getTask() › returns the task when repository resolves with a task | the task | As expected | ✅ PASS | — | 4ms |
| returns undefined when repository resolves with undefined | taskService › getTask() › returns undefined when repository resolves with undefined | undefined | As expected | ✅ PASS | — | 1ms |
| propagates RepositoryError thrown by the repository | taskService › getTask() › propagates RepositoryError thrown by the repository | error propagated | As expected | ✅ PASS | — | 26ms |

## ✅ tests\controllers\task.controller.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| calls res.json with the task when a valid UUID is provided and task is found | taskController › getTask() › calls res.json with the task when a valid UUID is provided and task is found | res.json with the task when a valid UUID is provided and task is found called | As expected | ✅ PASS | — | 7ms |
| throws NotFoundError when task is not found | taskController › getTask() › throws NotFoundError when task is not found | throws NotFoundError when task is not found | As expected | ✅ PASS | — | 17ms |
| throws ZodError when taskId is not a valid UUID | taskController › getTask() › throws ZodError when taskId is not a valid UUID | throws ZodError when taskId is not a valid UUID | As expected | ✅ PASS | — | 5ms |
| throws ZodError when taskId param is missing | taskController › getTask() › throws ZodError when taskId param is missing | throws ZodError when taskId param is missing | As expected | ✅ PASS | — | 1ms |
| propagates RepositoryError thrown by the service | taskController › getTask() › propagates RepositoryError thrown by the service | error propagated | As expected | ✅ PASS | — | 1ms |

## ✅ tests\engine\executors\EndNodeExecutor.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| evaluates resultMap FEEL expressions and returns COMPLETED with correct outputVariables | EndNodeExecutor › evaluates resultMap FEEL expressions and returns COMPLETED with correct outputVariables | COMPLETED with correct outputVariables | As expected | ✅ PASS | — | 39ms |
| returns FAILED when configuration.success is false even when FEEL evaluation succeeds | EndNodeExecutor › returns FAILED when configuration.success is false even when FEEL evaluation succeeds | FAILED | As expected | ✅ PASS | — | 1ms |
| returns FAILED when FEEL expression produces evaluation warnings | EndNodeExecutor › returns FAILED when FEEL expression produces evaluation warnings | FAILED | As expected | ✅ PASS | — | 4ms |
| returns COMPLETED when validationExpression evaluates to true | EndNodeExecutor › returns COMPLETED when validationExpression evaluates to true | COMPLETED | As expected | ✅ PASS | — | 4ms |
| returns FAILED when validationExpression evaluates to false | EndNodeExecutor › returns FAILED when validationExpression evaluates to false | FAILED | As expected | ✅ PASS | — | 10ms |
| returns COMPLETED with empty outputVariables when resultMap is empty | EndNodeExecutor › returns COMPLETED with empty outputVariables when resultMap is empty | COMPLETED with empty outputVariables | As expected | ✅ PASS | — | 2ms |
| throws DataIntegrityError when node configuration is invalid | EndNodeExecutor › throws DataIntegrityError when node configuration is invalid | throws DataIntegrityError when node configuration is invalid | As expected | ✅ PASS | — | 62ms |
| evaluates FEEL null literal to null without crashing | EndNodeExecutor › evaluates FEEL null literal to null without crashing | — | As expected | ✅ PASS | — | 2ms |

## ✅ tests\engine\executors\StartNodeExecutor.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| maps constants correctly from instanceInputVariables | StartNodeExecutor › maps constants correctly from instanceInputVariables | — | As expected | ✅ PASS | — | 6ms |
| puts input field with fetchableId into fetchables, not constants | StartNodeExecutor › puts input field with fetchableId into fetchables, not constants | — | As expected | ✅ PASS | — | 18ms |
| evaluates FEEL urlExpression and stores the result in urls keyed by fetchable id | StartNodeExecutor › evaluates FEEL urlExpression and stores the result in urls keyed by fetchable id | — | As expected | ✅ PASS | — | 2ms |
| returns COMPLETED with empty maps when inputDataMap and fetchables are empty | StartNodeExecutor › returns COMPLETED with empty maps when inputDataMap and fetchables are empty | COMPLETED with empty maps | As expected | ✅ PASS | — | 2ms |
| throws DataIntegrityError when node configuration is invalid | StartNodeExecutor › throws DataIntegrityError when node configuration is invalid | throws DataIntegrityError when node configuration is invalid | As expected | ✅ PASS | — | 102ms |
| throws DataIntegrityError when FEEL URL expression evaluates to a non-string | StartNodeExecutor › throws DataIntegrityError when FEEL URL expression evaluates to a non-string | throws DataIntegrityError when FEEL URL expression evaluates to a non-string | As expected | ✅ PASS | — | 4ms |
| ignores _context and _transaction params and still returns COMPLETED | StartNodeExecutor › ignores _context and _transaction params and still returns COMPLETED | COMPLETED | As expected | ✅ PASS | — | 1ms |

## ✅ tests\engine\ContextManager.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| returns empty global and next scopes | ContextManager › create() › returns empty global and next scopes | empty global and next scopes | As expected | ✅ PASS | — | 5ms |
| merges into GLOBAL scope and leaves next untouched | ContextManager › merge() › merges into GLOBAL scope and leaves next untouched | — | As expected | ✅ PASS | — | 1ms |
| merges into NEXT scope and leaves global untouched | ContextManager › merge() › merges into NEXT scope and leaves global untouched | — | As expected | ✅ PASS | — | 1ms |
| does not mutate the original context object | ContextManager › merge() › does not mutate the original context object | — | As expected | ✅ PASS | — | 1ms |
| flattens global and next into one object | ContextManager › resolveForNode() › flattens global and next into one object | — | As expected | ✅ PASS | — | 0ms |
| next scope values shadow global scope values for the same key | ContextManager › resolveForNode() › next scope values shadow global scope values for the same key | — | As expected | ✅ PASS | — | 0ms |
| empties next and preserves global | ContextManager › clearNextScope() › empties next and preserves global | — | As expected | ✅ PASS | — | 1ms |
| does not mutate the original context | ContextManager › clearNextScope() › does not mutate the original context | — | As expected | ✅ PASS | — | 34ms |
| returns correct WorkflowContext from well-formed JSON | ContextManager › fromJson() › returns correct WorkflowContext from well-formed JSON | correct WorkflowContext from well-formed JSON | As expected | ✅ PASS | — | 1ms |
| returns empty scopes when input is null | ContextManager › fromJson() › returns empty scopes when input is null | empty scopes | As expected | ✅ PASS | — | 1ms |
| defaults global to empty object when key is missing | ContextManager › fromJson() › defaults global to empty object when key is missing | — | As expected | ✅ PASS | — | 1ms |

## ✅ tests\engine\EdgeResolver.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| returns the destination id for a single outgoing edge | EdgeResolver › non-decision nodes › returns the destination id for a single outgoing edge | the destination id for a single outgoing edge | As expected | ✅ PASS | — | 8ms |
| returns all destination ids for multiple outgoing edges | EdgeResolver › non-decision nodes › returns all destination ids for multiple outgoing edges | all destination ids for multiple outgoing edges | As expected | ✅ PASS | — | 2ms |
| returns empty array when there are no outgoing edges | EdgeResolver › non-decision nodes › returns empty array when there are no outgoing edges | empty array | As expected | ✅ PASS | — | 0ms |
| excludes edges with null destination_node_id | EdgeResolver › non-decision nodes › excludes edges with null destination_node_id | — | As expected | ✅ PASS | — | 0ms |
| treats completedNodeId not found in nodes as a non-decision node | EdgeResolver › non-decision nodes › treats completedNodeId not found in nodes as a non-decision node | — | As expected | ✅ PASS | — | 1ms |
| returns destination of matching conditional edge | EdgeResolver › decision nodes › returns destination of matching conditional edge | destination of matching conditional edge | As expected | ✅ PASS | — | 114ms |
| falls back to default edge when no condition matches | EdgeResolver › decision nodes › falls back to default edge when no condition matches | — | As expected | ✅ PASS | — | 4ms |
| throws StateTransitionError when no condition matches and no default edge | EdgeResolver › decision nodes › throws StateTransitionError when no condition matches and no default edge | throws StateTransitionError when no condition matches and no default edge | As expected | ✅ PASS | — | 88ms |
| returns all destinations when multiple conditions match | EdgeResolver › decision nodes › returns all destinations when multiple conditions match | all destinations | As expected | ✅ PASS | — | 3ms |

## ✅ tests\engine\queue\BullMQQueue.test.ts

| Test Case | Description | Expected Result | Actual Result | Status | Error Details | Additional Notes |
|-----------|-------------|-----------------|---------------|--------|---------------|-----------------|
| calls queue.add() with the job data and correct options | BullMQQueue › enqueue() › calls queue.add() with the job data and correct options | queue.add() with the job data and correct options called | As expected | ✅ PASS | — | 5ms |
| sets jobId to instanceId-nodeId for deduplication | BullMQQueue › enqueue() › sets jobId to instanceId-nodeId for deduplication | — | As expected | ✅ PASS | — | 1ms |
| sets attempts: 3 and exponential backoff | BullMQQueue › enqueue() › sets attempts: 3 and exponential backoff | — | As expected | ✅ PASS | — | 3ms |
| uses the EXECUTION_QUEUE_NAME constant as the queue name | BullMQQueue › enqueue() › uses the EXECUTION_QUEUE_NAME constant as the queue name | — | As expected | ✅ PASS | — | 1ms |
| calls queue.close() | BullMQQueue › close() › calls queue.close() | queue.close() called | As expected | ✅ PASS | — | 1ms |
