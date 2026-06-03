# custom-nodes — your organization's n8n custom nodes

The operational pattern is a **prebuilt mirror** (`dist-prebuilt/`).
You copy the built `.node.js` / `.credentials.js` files from your own internal node repo into
`dist-prebuilt/`, and docker mounts them so they load instantly.

> `dist-prebuilt/` is **never committed** — it's your organization's private build output.
> It is git-ignored, and `omn-setup` populates it locally from `OMN_PREBUILT_SOURCE`.

```
custom-nodes/
├── dist-prebuilt/          ← operational pattern: your prebuilt node mirror (git-ignored)
│   ├── *.node.js
│   └── *.credentials.js
├── nodes/                  ← future pattern: TS source workspace (currently empty)
├── package.json
└── tsconfig.json
```

## Using a node when authoring workflows

```
/oh-my-n8n:n8n-new-workflow
```

The authoring agent only uses nodes registered in `schemas/internal-nodes.json`.

## Refreshing your custom nodes

When your internal build output is updated:

```bash
cp "$OMN_PREBUILT_SOURCE"/*.js custom-nodes/dist-prebuilt/
npm run extract-catalog          # refresh schemas/internal-nodes.json
/oh-my-n8n:n8n-restart           # reflect into the running container
```

## Adding a new node (from TS source) — future pattern

Adding nodes as single packages under `nodes/<NodeName>/` is a planned pattern.
Currently only prebuilt nodes (from your own build pipeline) are supported.

```
/oh-my-n8n:n8n-new-node <NodeName>     # scaffold (n8n-node-developer agent)
```

## Catalog SSOT

- Source: `custom-nodes/dist-prebuilt/*.js` (mirrored from your internal node repo)
- Auto-extracted catalog: `npm run extract-catalog` → `schemas/internal-nodes.json`
