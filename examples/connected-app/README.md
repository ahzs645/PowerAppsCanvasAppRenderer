# Connected app example

A tiny canvas app that runs **fully locally against fake connections** — no
Microsoft backend, no sign-in, no real SharePoint.

## What it shows

- A `Tasks` data source (a SharePoint-style list) defined in
  [`connections.json`](./connections.json) and used by the gallery via
  `SortByColumns(Filter(Tasks, Done = false), "DueDate")`.
- The built-in `Office365Users` connector: the header reads
  `Office365Users.MyProfile().DisplayName`.
- Writing back to a data source: **Add sample task** runs
  `Patch(Tasks, Defaults(Tasks), { ... })`, which inserts a row and mints the
  next `ID` just like a real SharePoint list.

## Run it

1. `npm run dev`
2. Click **Open app folder…** and pick this `connected-app` folder (or drag it
   onto the canvas). The `*.pa.yaml` files render and `connections.json` is
   picked up automatically.
3. Click the **🔌 sources** button in the toolbar to view/edit the fake data
   live, then **Apply & run**.

## How fake connections work

| Concept | Real Power Apps | Local renderer |
| --- | --- | --- |
| Tabular source (SharePoint/SQL/Dataverse) | connector + dataset + table over HTTPS | `dataSources` entry with seeded `rows` |
| `Filter` / `LookUp` / `Sort` / `Search` | delegated query | evaluated in-memory over `rows` |
| `Patch` / `Collect` / `Remove` | REST write | mutates `rows`, mints `ID`/GUID on insert |
| `Office365Users.MyProfile()` etc. | connector API call | built-in fake handler (swagger-shaped record) |
| Action connectors (`SendEmailV2`…) | side-effecting API | no-op logged to an in-memory outbox, or canned `connectorResponses` |

See [`../../aidocs/local-first-renderer.md`](../../aidocs/local-first-renderer.md)
for the full design and the connector/data-source model mined from the portal.
