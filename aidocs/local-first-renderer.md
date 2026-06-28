# Local-First Canvas App Renderer — Gap Analysis & Roadmap

This document maps **what it takes to render Power Apps canvas apps locally** (no
Microsoft backend, no sign-in, fake connections), measured against how the real
platform works. The "real platform" findings come from a full capture of the
`make.powerapps.com` maker portal (player runtime, the **1,535-connector**
catalog with swagger, the control library, and live API responses), build
`v3.26061.13`.

It also documents the **fake-connections / data-source layer** added in this
change set.

---

## 1. TL;DR

The renderer already nails the hard part: it parses Power Apps **source format**
(`*.pa.yaml`), runs a pragmatic **Power Fx interpreter**, and renders Fluent UI
controls — all client-side. The single biggest gap was **no concept of data
sources or connections**: any app that talks to SharePoint/SQL/Dataverse/Office
365 (i.e. almost every real app) failed silently.

That gap is now closed for local development:

- **Tabular data sources** (SharePoint list / SQL table / Dataverse table /
  Excel table) are first-class. `Filter / LookUp / Sort / Search / Patch /
  Collect / Remove / SortByColumns` all work against seeded rows, including
  **minting a new `ID`/GUID on insert** like the real services.
- **Connector method calls** resolve: `Office365Users.MyProfile()`,
  `Office365Outlook.SendEmailV2(...)`, etc., via a built-in registry plus an
  editable JSON config of canned responses.
- Everything is driven by one editable file (`default-connections.json` /
  `connections.json` dropped next to the app / the **🔌 panel** in the toolbar).

The rest of this doc is the map of what's still missing, prioritized.

---

## 2. Current architecture (what runs)

The live entry point is **`src/Preview.tsx`** (not `App.tsx`, which is the older
Clerk/Supabase shell). The pipeline:

```
*.pa.yaml folder ──► parser.ts ──► normalized control tree
                                        │
default-connections.json ──► connections.ts ──► seeds Store (dataSources + connectors)
                                        │
                          PowerFxContext (runs App.OnStart) 
                                        │
                     ControlMapper ──► BasicRenderers (Fluent UI)
                                        │
                         powerfx.ts evaluates every property/formula
```

| Area | File | Status |
| --- | --- | --- |
| Source (`.pa.yaml`) loader (folder/drag-drop, multi-file, App+screens) | `utils/parser.ts` | Good |
| Power Fx interpreter (tokenizer→AST→eval) | `utils/powerfx.ts` | Good subset, extended here |
| Control rendering (~16 types) | `components/ControlMapper.tsx`, `components/renderers/BasicRenderers.tsx` | Partial (see §5) |
| State / OnStart / context | `context/PowerFxContext.tsx` | Good |
| **Fake connections / data sources** | `utils/connections.ts` | **New (this change)** |
| `App.tsx` (Clerk + Supabase + mockData editor) | `src/App.tsx` | Legacy/alternate; `mockData` was never wired to the engine |
| `utils/interpreter.ts` | — | **Dead code** (not imported); superseded by `powerfx.ts`. Safe to delete. |

---

## 3. Fake connections — design & usage (implemented)

### Model (mirrors the real connector model)
Real Power Apps binds a data source to `apiId` (connector) + `connectionId` +
`datasetName` (SharePoint site / SQL server,db) + `tableName` (list/table), and
invokes swagger `operationId`s through an HTTPS proxy. We **collapse all of that
into one in-memory dispatcher** keyed by name/namespace — no network, no auth.

### Config format (`connections.json`)
```jsonc
{
  "dataSources": {
    "Tasks": {                               // the Power Fx identifier
      "connector": "shared_sharepointonline",// display only
      "datasetName": "https://contoso.sharepoint.com/sites/team",
      "tableName": "Tasks",
      "primaryKey": "ID",                     // minted on insert
      "idKind": "int",                        // "int" (SharePoint/SQL) | "guid" (Dataverse)
      "schema": { "ID": "Number", "Title": "Text", "DueDate": "DateTime", "Done": "Boolean" },
      "rows": [ { "ID": 1, "Title": "Write spec", "DueDate": "2026-07-01", "Done": false } ]
    }
  },
  "connectorResponses": {                     // canned action-connector results
    "Office365Users": { "MyProfile": { "DisplayName": "Ada", "Mail": "ada@x.com" } }
  }
}
```

### Behavior
| Power Fx | Against a fake data source |
| --- | --- |
| `Filter` / `LookUp` / `Sort` / `SortByColumns` / `Search` / `FirstN` / `CountRows` | evaluated in-memory over `rows` (no delegation limits locally) |
| `Patch(DS, Defaults(DS), {…})` | inserts, **mints `ID` (int++) or GUID** per `idKind` |
| `Patch(DS, existingRow, {…})` | matches on `primaryKey`, merges changes |
| `Collect` / `ClearCollect` / `Remove` / `RemoveIf` / `UpdateIf` / `Clear` | mutate `rows` in place |
| `Defaults(DS)` | blank record from `schema` (PK left blank) |
| `DateTime` columns | coerced to real `Date` objects so `Text()`/date funcs format them |

### Built-in connectors (always present, no config needed)
- **`Office365Users`** — `MyProfile(_V2)`, `UserProfile(_V2)`, `SearchUser(_V2)`,
  `Manager(_V2)`, `DirectReports`, `UserPhoto` — returns swagger-shaped profile
  records from a small fake directory seeded with the current user.
- **`Office365Outlook`** / `Office365` — `SendEmailV2/V3`, calendar/email reads;
  side-effecting calls are no-ops **logged to `store.outbox`** (inspectable),
  reads return empty tables.
- Any connector can be added/overridden via `connectorResponses`.

### How to use
1. `npm run dev`, click **Open app folder…**, pick a `.pa.yaml` app folder. A
   sibling `connections.json` is auto-loaded.
2. Or edit fake data live via the **🔌 N sources** toolbar button → **Apply & run**.
3. See `examples/connected-app/` for a complete runnable example.

---

## 4. Power Fx function coverage

Confirmed present in the real build and **added in this change**: `Now`, `Today`,
`Date`, `Time`, `Hour`, `Minute`, `Second`, `Weekday`, `IsToday`, `DateAdd`,
`DateDiff`, `ParseJSON`, `JSON`, `GUID`, `Replace`, `Find`, `Proper`, `TrimEnds`,
`Char`, `UniChar`, `PlainText`, `EncodeUrl`, `IsMatch` (incl. `Match.*`),
`IsNumeric`, `Boolean`, `Trunc`, `Exp`, `Ln`, `Log`, `Pi`, `Rand`, `RandBetween`,
`Sequence`, `AddColumns`, `DropColumns`, `RenameColumns`, `ShowColumns`,
`Distinct`, `Search`, `IfError`, `Defaults`, `DataSourceInfo`.

**Still missing** (prioritized for later):
| Priority | Functions |
| --- | --- |
| High | `Match` / `MatchAll` (return groups), `GroupBy` / `Ungroup`, `Concurrent`, `SubmitForm` / `EditForm` / `NewForm` / `ResetForm` / `ViewForm` (real form lifecycle), `SaveData` / `LoadData` / `ClearData` (localStorage) |
| Medium | `WeekNum` / `ISOWeekNum` / `EDate` / `EOMonth` / `TimeZoneOffset`, `Sin/Cos/Tan/…`, `Degrees`/`Radians`, `Decimal`/`Float`/`Hex2Dec`/`Dec2Hex`, `IsType`/`AsType`, `Relate`/`Unrelate`, `Errors`/`Validate`, `ColorFade` (real), `Shuffle`, `Choices` |
| Low | `Print`, `Copy`, `Download`, `Exit`, `Param`, `RequestHide`, `Confirm`, `StdevP`/`VarP`, AI/device signals |

---

## 5. Control coverage

Has today: `label/text`, `button`, `textinput`, `icon`, `toggle/checkbox`,
`image`, `gallery`, `datepicker`, `rectangle`, `circle`, `groupcontainer`,
`dropdown`, `combobox`, `form/editform`, `typeddatacard`, `screen`,
`canvascomponent`. Everything else renders a dashed placeholder.

**Highest-value missing controls** (common in real classic apps):
| Priority | Controls |
| --- | --- |
| High | **Data table**, **HTML text** (`HtmlViewer`), **List box**, **Radio**, **Slider**, **Number input** |
| Medium | Charts (column/line/pie), Rich text editor, Tab list / Tab container, Fluid grid, Triangle/Arrow shapes, Camera, PDF/Video, group-container **AutoLayout variants** (H/V), modern Fluent v9: Progress, Spinner, Avatar, Badge |
| Low | Pen/Ink, Barcode, Microphone, Map, AI Builder controls, Mixed reality, Power BI tile |

**Notes for implementers:**
- Classic keys are lowercase (`button`, `slider`); **modern** controls are
  namespaced (`PowerApps_CoreControls_*`, Fluent v9) and versioned (`Button@0.0.44`).
- Shapes are **one template family** parameterized by shape key — add one, get all.
- Group container is one template with `LayoutMode`/`LayoutDirection` variants;
  the renderer should branch on those for auto-layout.
- Icons map Power Fx `Icon.*` → the **`Basel_*`** glyph set (180 glyphs).

---

## 6. App document & loader gaps

| Gap | Detail | Priority |
| --- | --- | --- |
| Canvas size from app metadata | Real apps carry `primaryDeviceWidth/Height`, `primaryFormFactor`, `supportsPortrait/Landscape`, `showStatusBar`. The `.pa.yaml` source doesn't include these (they live in `.msapp`); the renderer uses manual presets. If importing `.msapp`, honor them. | Medium |
| Themes | Theme lives in the document (`Themes`, `CurrentAppTheme`), **not** an API. Modern controls theme via Fluent v9 design tokens; classic via per-control color/font props. The renderer should load the app theme palette and expose `Color.*` (140 named), `Font.*`, `Align.*` enums. | Medium |
| `DataSources` declarations | Modern `pac canvas` source can include data-source/connection definitions; the loader currently ignores them (we drive sources from `connections.json` instead). Wire these so a real exported app auto-registers its sources (then merge seed rows). | Medium |
| Components | `ComponentDefinitions` (canvas components) aren't rendered. Gate on `hasComponent`. | Medium |
| Media resources | `MediaResources` (embedded images/fonts) aren't resolved for source apps. | Low |
| `.msapp` import | Only unpacked `.pa.yaml` is supported. A `.msapp` is a zip the platform unpacks to source; supporting direct `.msapp` import (unzip in browser) would broaden input. | Low |

---

## 7. Backend API surface — stub / mock / ignore

If we ever reuse Microsoft's player or render published apps, this is what the
backend provides. For our **own** local renderer almost all of it is unnecessary:

| Endpoint family | Verdict | Why |
| --- | --- | --- |
| App metadata (`/apps/{id}`) → `documentUri`, canvas tags | **Stub** | source pointer + canvas settings (only if importing `.msapp`) |
| `connectivity/connectors` (5MB swagger), `connectivity/connections` | **Ignore / lazy** | our fake layer replaces this; useful only to auto-generate connector stubs |
| `features` (tenant+env, ~230KB) | **Ignore** | flag descriptors only — **none govern client rendering** (red herring) |
| `evaluateDlpPoliciesForApp`, `gateway/cluster`, `locate`, `plans`, `enroll`, `notifications`, `startSession`, `componentDependencies`, `checkComponentUpdates` | **Mock/Ignore** | routing/governance/co-authoring; return empty/static |
| Dataverse `$batch`, `EntityDefinitions`, `organizations`, `systemusers` | **Stub if Dataverse-bound** | our fake Dataverse-style data sources replace these for local dev |
| `graph.microsoft.com/me`, systemusers | **Mock** | backs `User()` / Office365 profile — already faked |
| OneDS telemetry (`*.events.data.microsoft.com`) | **Disable** | must be no-op'd for local-first |

---

## 8. Identity / locale gaps

- `User()` is faked from the current user (or a mock). **`User().Image`,
  `Language()`, and currency/date locale have no source even in the real capture**
  and must be supplied as static config. Default `en-US`; make configurable.

---

## 9. "Things we hadn't discovered" — callouts

- **`SaveData` / `LoadData` / `ClearData`** are real and common (offline cache to
  `ms-appdata`). Implement against `localStorage`/IndexedDB. (Currently no-op.)
- **Telemetry (OneDS/OneCollector)** is wired throughout the real player — must be
  neutralized for any reuse of Microsoft code.
- **Copilot** is pervasive but gated off; ignore for rendering.
- **Co-authoring / SignalR** is authoring-only; ignore for a runtime renderer.
- **Two-tier CDN + strict versioning** (`content.powerapps.com` →
  `static.powerapps.com`, pinned to `v3.26061.13...`) — relevant only if hosting
  the real `web-player/`.
- **`identity.json`** maps stable control GUIDs ↔ names — useful for round-tripping
  edits, not for read-only render.

---

## 10. Roadmap (suggested order)

1. **✅ Fake connections / data sources** (this change) — unblocks data-driven apps.
2. **Form lifecycle** — real `SubmitForm/EditForm/NewForm/ResetForm` against data
   sources + the Form/DataCard renderers reading from `DataSource`/`Item`.
3. **High-value controls** — Data table, HTML text, Slider, Radio, List box,
   Number input; then charts.
4. **`SaveData/LoadData`** on `localStorage` + remaining string/date/table funcs
   (`GroupBy/Ungroup`, `Match/MatchAll`, `Concurrent`).
5. **Theme + enums** — load app theme; expose `Color.*`/`Font.*`/`Align.*`.
6. **Auto-register data sources from `.pa.yaml`** (merge with seed rows) and
   optionally **import connector swagger** to auto-stub connector operations.
7. **`.msapp` import** (unzip → source) + honor app metadata (canvas size, etc.).
8. Cleanup: delete dead `utils/interpreter.ts`; decide on `App.tsx` vs `Preview.tsx`.

---

*Generated from the `make.powerapps.com` capture analysis. The connector/data-source
model in §3 is the reference for any future swagger-driven connector stubbing.*
