# Question registration API

All operations use authenticated `POST /api/auth/<action>` with JSON
`{"payload": {...}}`, the existing Bearer session token, and the configured frontend Origin.

| Action | Purpose | Permission |
| --- | --- | --- |
| `catalog_get` | Read one master catalog, including UUIDv7 IDs and topic parent names | Training catalogs: any of `questions:view/create/update`; system catalogs: `catalog:view` |
| `catalog_save` | Register/edit master values; existing IDs remain stable | Training catalogs: `questions:create` or `questions:update`; system catalogs: `catalog:update` |
| `question_catalogs` | Read question catalogs and the assessment type catalog in one request | `questions:view` |
| `question_list` | Search, filter, sort and page questions with joined names | `questions:view` |
| `question_get` | Read one question by `id` | `questions:view` |
| `question_save` | Create or update a question | `questions:create` / `questions:update` |
| `question_import` | Create 1–100 questions atomically | `questions:import` |
| `question_folder_list` | Read folders and current question counts | `questions:view` |
| `question_folder_save` | Register a folder with `name`, `description`, `levelId` | `questions:create` |
| `question_simulation_list` | List reusable HMI simulation screens | `questions:view` |
| `question_simulation_save` | Register or update a reusable simulation screen and its operation rules | `questions:create` / `questions:update` |

Catalog keys: `level`, `question_format`, `specialty`, `question_topic`,
`target_group`, `cognitive_level`, `assessment_type`. Each option returns `id`, `value`, `label`,
`active`, and optional `parentId`. Use `id` for question references;
`value` is the human readable business code. `All` is a folder level only.

`question_save` payload fields:

```json
{
  "levelId": "<UUIDv7 from level>",
  "formatId": "<UUIDv7 from question_format>",
  "specialtyId": "<UUIDv7 from specialty>",
  "topicId": "<UUIDv7 from question_topic belonging to specialtyId>",
  "targetGroupId": "<UUIDv7 from target_group>",
  "cognitiveLevelId": "<UUIDv7 from cognitive_level>",
  "content": "Question content",
  "explanation": "Explanation",
  "type": "single_choice",
  "status": "draft",
  "options": [
    {"id": "a", "text": "First answer", "isCorrect": true},
    {"id": "b", "text": "Second answer", "isCorrect": false}
  ]
}
```

Optional `folderId` must match the question level (or the folder's `All` level).
For essays, use `type: "essay"` and `rubrics: [{id,title,maxScore,description}]`.
Updating requires the existing `id` and `version` from `question_get`.
A stale version returns HTTP 409. Publishing requires `questions:approve`;
normal registration uses `draft` or `pending_review`.

Simulation screens are reusable records. Register them at `/manage/question-simulations`, then select one in a question whose format is `simulation_hmi`. `question_save` accepts `simulationId`; question reads include the linked `simulation` configuration. Screen templates currently support MES dispatch and emergency stop, with editable mission text, initial sensor values, and dispatch target/limits.

List payload supports `search`, `page`, `pageSize` (maximum 500), `folderId`,
`level` business code, `filters`, `sortField`, and `sortAsc`.
Filter/sort fields: `id`, `content`, `level`, `format`, `topic`, `targetGroup`,
`difficulty`, `version`, `author`, `updatedAt`, `isCritical`, `status`.
Responses return `data` and list `meta: {total,page,pageSize}`.
Import payload is `{questions: [<question_save payload>, ...]}`; updates are rejected.

`_QSTQuestion` stores only the six UUID foreign keys for master references.
`_QSTQuestionView` resolves current names through `LEFT JOIN` to
`_SYSCatalogOption`; no master display name is copied into the question row.

UI entry points:
- `/manage/question-settings`: six training catalogs and registration dialogs, including topic → specialty; authors manage these through question permissions.
- `/admin/catalog`: system catalogs such as rank, department, position, business role and language.
- `/manage/questions`: question list, folders, detail preview, import dialog.
- `/manage/questions/new`: create form with six dynamic catalogs.
- `/manage/questions/:id/edit`: load and edit the stored question.
- `/manage/question-simulations`: register and edit reusable HMI screens for simulation questions.

The question form also opens catalog registration inline. Saving refreshes its
dropdowns while retaining the question draft. Training catalog permissions do not
grant access to system catalogs, user administration or security management.

Run `go test ./internal/skillauth -run TestQuestion -count=1 -v` from server-core.
Database integration checks roll back their transactions. HTTP checks require the
local API on port 8081 and clean up only their uniquely identified test records/session.
