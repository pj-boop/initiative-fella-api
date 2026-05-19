# Split OpenAPI scaffolding status

The split files in this directory (`docs/openapi/components/**` and `docs/openapi/paths/**`) are scaffolding only right now.

`docs/openapi.yaml` remains the active generator input used by:

- `openapi-typescript docs/openapi.yaml --output src/api/generated/schema.ts`

Until split wiring is completed, keep `docs/openapi.yaml` as the source of truth and treat this folder as a staged copy to avoid drift.
