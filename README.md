# oh-my-n8n

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
