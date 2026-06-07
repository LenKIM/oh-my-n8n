# oh-my-n8n

[English](./README.md) · [한국어](./README.ko.md)

A multi-agent Claude Code harness for **n8n** — authoring, validating, and operating workflows.
It adapts the multi-agent orchestration patterns of `oh-my-claudecode` (OMC) to the n8n domain.

The plugin itself is a **thin wrapper**. The actual data (your organization's custom-node mirror,
catalogs, docker, `node_modules`) lives in a **workspace** on your machine. The first time you use it,
`/oh-my-n8n:omn-setup` automates the whole installation.

## What it does

- **Custom-node mirror** (`custom-nodes/dist-prebuilt/`) — drop your organization's prebuilt n8n
  nodes here; docker mounts them so they load instantly. (Kept local — never committed.)
- **Declarative community plugins** (`plugins/plugins.yaml`) — whitelist + lockfile.
- **Workflow authoring agent** — requirements → validated JSON → dry-run → deploy.
- **Version migration agent** — handles breaking changes automatically when you upgrade n8n.

## How it works

oh-my-n8n is not a docker wrapper — it's a **multi-agent harness** that splits n8n work across
seven specialized sub-agents and enforces a *write / verify separation* so no agent ever approves
its own output.

### The agents

Each agent runs in its own context with a model picked for the job (lookups are cheap, design and
review are not):

| Agent | Model | Role |
|---|---|---|
| `n8n-workflow-author` | sonnet | Natural-language requirements → workflow JSON. Uses **only** registered nodes (`custom-nodes/`, `plugins.yaml`); secrets are credential references, never literals. |
| `n8n-workflow-reviewer` | opus | Independently re-checks the author's JSON in a **separate context** — schema fit, secret leaks, expression syntax, node registration, single-trigger rule, dead nodes. The author cannot self-approve. |
| `n8n-node-developer` | opus | Authors/edits the organization's TypeScript custom nodes against the `INodeType` standard. |
| `n8n-debugger` | sonnet | Takes an execution ID / error stack trace, pinpoints the failing node, proposes a fix. |
| `n8n-migrator` | opus | Detects and auto-migrates breaking changes (typeVersion bumps, deprecated nodes) on n8n upgrades. |
| `n8n-ops` | sonnet | docker/k8s lifecycle, health checks, backup/restore, log collection. |
| `explore` | haiku | Fast read-only catalog/schema/example lookups. |

### What keeps workflows correct

- **Write / verify separation** — authoring and review are always separate passes. Self-approval in
  one context is forbidden (the core OMC orchestration pattern, specialized for n8n).
- **Catalog-grounded nodes** — every node in a generated workflow must exist in the core-node
  catalog (`schemas/n8n-core-latest.schema.json`, 502 nodes) or your custom-node mirror.
  Unregistered nodes are rejected, and the harness points you to `n8n-pkg-add` / `n8n-new-node`.
- **No hardcoded secrets** — tokens are only ever n8n credential references; a regex scan blocks
  literals before a workflow is considered done.
- **Automatic validation hook** — a PostToolUse hook runs `validate-workflow.mjs` whenever a
  `*.workflow.json` is written/edited, and injects the result back so failures are fixed immediately.
- **Evidence before "done"** — no completion is declared until `validate-workflow.mjs` passes,
  exactly one trigger exists, and (on deploy) a dry-run succeeds on a live instance.

## Install

### 1. Prerequisites

- Claude Code installed (`claude` CLI available)
- Docker Desktop or Docker Engine
- Node.js >= 18
- (Optional) A source directory of your organization's prebuilt n8n nodes, if you use custom nodes

### 2. Register the plugin (inside Claude)

Run Claude Code, then type in the Claude prompt:

```
/plugin marketplace add https://github.com/<your-org>/oh-my-n8n.git
```

> If you have it cloned locally, a path also works:
> `/plugin marketplace add /path/to/oh-my-n8n`

### 3. Install + enable the plugin

```
/plugin install oh-my-n8n@oh-my-n8n
```

Confirm:

```
/plugin list
```

When `oh-my-n8n` shows up as active, you're set. The 12 slash commands (`/oh-my-n8n:*`) become available.

### 4. Bootstrap the workspace

```
/oh-my-n8n:omn-setup
```

The setup skill runs, in order:

1. Clone (or pull) the workspace into `~/.oh-my-n8n`
2. `npm install`
3. Copy your prebuilt custom nodes (from the path in `OMN_PREBUILT_SOURCE`, if you use custom nodes)
4. Extract the catalog (`schemas/internal-nodes.json`)
5. Start the docker instance (delegated to `/oh-my-n8n:n8n-up --rebuild`, http://localhost:15679)
6. Cache the core-node catalog (`schemas/n8n-core-latest.schema.json`)
7. Record the workspace location in `~/.claude/oh-my-n8n.local.md`

After this, the other skills pick up the configuration automatically.

### 5. Verify

```
/oh-my-n8n:n8n-doctor
```

All checks PASS → ready to go.

### Updating the plugin

When the plugin code is updated:

```
/plugin marketplace update oh-my-n8n
/plugin update oh-my-n8n
```

The workspace (`~/.oh-my-n8n`) is updated separately with
`cd ~/.oh-my-n8n && git pull && npm install`, or by re-running `/oh-my-n8n:omn-setup` (idempotent).

## Environment check

```
/oh-my-n8n:n8n-doctor
```

A set of PASS/FAIL checks with a one-line recovery command per failure.

## Daily use

Workflows:
```
/oh-my-n8n:n8n-new-workflow      # requirements → workflow JSON
/oh-my-n8n:n8n-validate <path>   # validate
/oh-my-n8n:n8n-deploy <path>     # upload to an n8n instance
/oh-my-n8n:n8n-new-node <Name>   # scaffold a custom node
/oh-my-n8n:n8n-pkg-add <pkg>     # add a community plugin
/oh-my-n8n:n8n-upgrade <version> # n8n version upgrade migration
```

Docker lifecycle:
```
/oh-my-n8n:n8n-up                # start (skips if already running)
/oh-my-n8n:n8n-up --rebuild      # rebuild image, then start
/oh-my-n8n:n8n-down              # stop (data preserved)
/oh-my-n8n:n8n-restart           # restart (picks up custom-node changes)
/oh-my-n8n:n8n-logs --tail 50    # logs (--follow / --since / --grep)
```

## Workspace location resolution order

1. `OMN_WORKSPACE` environment variable
2. The `workspace:` frontmatter in `~/.claude/oh-my-n8n.local.md`
3. `~/.oh-my-n8n` (default)

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `OMN_WORKSPACE` | `~/.oh-my-n8n` | Absolute workspace path |
| `OMN_PREBUILT_SOURCE` | (none) | Source dir of your prebuilt custom nodes |
| `N8N_URL` | `http://localhost:15679` | Target instance for deploys |
| `N8N_API_KEY` | (none) | n8n REST API key |

## Layout

```
Plugin (distributed):              Workspace (you clone):
  agents/                            custom-nodes/dist-prebuilt/   ← your custom-node mirror
  skills/                            schemas/                       ← catalog cache
  hooks/hooks.json                   workflows/                     ← workflows you author
  scripts/lib/workspace.mjs          plugins/                       ← community-node yaml
                                     docker/                        ← local instance
                                     node_modules/
                                     ~/.claude/oh-my-n8n.local.md   ← workspace pointer
```

## Verified environment

- n8n 2.15.0
- n8n core-node catalog (502 nodes)
- Optional: your organization's prebuilt custom nodes (mirrored into `custom-nodes/dist-prebuilt/`)

See `DESIGN.md` for the design and `CLAUDE.md` for operating principles.

## License

See [LICENSE](./LICENSE).
