# Custom node specs

This directory holds the spec docs for **your organization's custom n8n nodes** — one Markdown
file per node. The workflow-authoring agent reads these (and `schemas/internal-nodes.json`) to know
how each custom node is shaped, so it can compose correct workflow JSON.

These specs are intentionally **not shipped** with the open-source harness, because custom nodes are
organization-specific. Add your own here.

## File format

Each node spec is a single Markdown file with two parts:

1. **Form fields** — the `node type`, `name`, `version`, `description` values (copy-paste into your
   node registration UI, if you use one).
2. **Spec body** — the Markdown spec starting from `### 설명` / `### Description`.

Suggested section order:

```
### Description
### Parameters
### Input / Output
### Usage examples
### Connection rules
### JSON example
```

The JSON example should include two kinds:

1. **Workflow node definition** — how the node looks inside workflow JSON (the LLM uses this when authoring).
2. **Output** — the shape of the data flowing to the next node (the actual execution result).

## Node type prefix convention

Use a stable prefix for your custom node types, e.g. `CUSTOM.<nodeName>` (`CUSTOM.myNode`). Keep it
consistent with what `extract-node-catalog.mjs` writes into `schemas/internal-nodes.json`.

## Catalog SSOT

- Source: `custom-nodes/dist-prebuilt/*.js` (your mirrored build output — git-ignored)
- Auto-extracted catalog: `npm run extract-catalog` → `schemas/internal-nodes.json`
