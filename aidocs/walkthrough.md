# Codebase Walkthrough for Agents

This document provides a comprehensive technical overview of the **PowerApps Canvas App Renderer**, designed to help AI agents and developers understand the project structure, logic, and architecture.

## 🏗️ Project Overview
This application is a **React + Vite** project that renders PowerApps Canvas Apps directly from their YAML source code. It uses **Fluent UI** for components, **Clerk** for authentication, and **Supabase** for data persistence.

### Tech Stack
- **Frontend**: React, TypeScript, Vite
- **UI Framework**: Fluent UI React Components
- **Icons**: Lucide React & Fluent System Icons
- **Auth**: Clerk
- **Backend/DB**: Supabase
- **YAML Engine**: `js-yaml`

---

## 🛠️ Key Workflows

### 1. Parsing & Normalization
The entry point for YAML processing is `parsePowerYAML` in `src/utils/parser.ts`.
- **Parsing**: Converts YAML string to a raw JSON object using `js-yaml`.
- **Normalization**: recursively traverses the JSON, mapping PowerApps control types (e.g., `Classic/Label@1`) to internal lowercase types (e.g., `label`).
- **Layout Math**: Resolves PowerApps formulas like `Parent.Width - 20` into CSS `calc()` strings during normalization. It builds a `controlMap` to resolve cross-control references (e.g., `Rectangle1.Height`).

### 2. State & Context Management
The `PowerFxProvider` in `src/context/PowerFxContext.tsx` handles the application state.
- **Variables**: Stores global variables set via `Set()` or `UpdateContext()`.
- **Controls**: Stores properties of all registered controls, enabling cross-control property access (e.g., `Label1.Text`).
- **Execute**: A function to run PowerFx actions (side effects).
- **Evaluate**: A function to calculate the current value of a property based on context (Variables + Controls + Self + Parent).

### 3. Rendering Engine
- **`ControlMapper.tsx`**: A recursive component that takes a normalized control object. It uses the `As` property to select the correct renderer and recursively renders `_Children`.
- **`PositionWrapper.tsx`**: Wraps individual renderers to handle absolute positioning (`X`, `Y`) and dimensions (`Width`, `Height`) based on the parsed/evaluated values.
- **`BasicRenderers.tsx`**: Contains the actual UI implementations for each control type (Label, Button, Image, etc.), typically using Fluent UI components.

---

## 📂 Core Utilities

### `src/utils/parser.ts`
- **`processValue`**: The "pre-processor" for property values. It detects if a value is a formula, a color, or a simple literal.
- **`parseFormulaToCSS`**: Specifically handles math/layout formulas and converts them to CSS-ready strings.
- **`normalizeControlSource`**: The recursive engine that builds the clean internal tree.

### `src/utils/interpreter.ts`
- **`executePowerFxAction`**: Naive interpreter for actions like `Set(Var, Val)`, `Navigate(Screen)`, `Back()`, and `Notify()`.
- **`evaluateExpression`**: Runtime evaluator for property formulas. Handles string concatenation (`&`), lookups, and basic arithmetic.

### `src/utils/validator.ts`
- **`validateControl`**: Compares the parsed control against `KNOWN_CONTROLS` and `COMMON_PROPS` to report "Unknown Control" or "Unknown Property" warnings.

---

## 🚀 Common Extension Tasks

### Adding a New Control Type
1.  **Validator**: Register the control and its supported properties in `KNOWN_CONTROLS` inside `src/utils/validator.ts`.
2.  **Renderer**: Create a new renderer component in `src/components/renderers/BasicRenderers.tsx`.
3.  **Mapper**: Import and add the new renderer to the selection logic in `src/components/ControlMapper.tsx`.

### Updating Formula Logic
- If it's a **Layout Property** (X, Y, Width, Height, etc.): Modify `parseFormulaToCSS` in `src/utils/parser.ts`.
- If it's a **Functional Property** (Text, Fill, OnSelect, etc.): Modify `evaluateExpression` or `executePowerFxAction` in `src/utils/interpreter.ts`.

---

## 🔌 Fake Connections & Data Sources
The renderer runs data-driven apps **locally with no backend** via `src/utils/connections.ts`.
- **Data sources** (SharePoint/SQL/Dataverse/Excel-style tables) are seeded from a JSON config (`src/default-connections.json`, or a `connections.json` dropped next to an app, or the 🔌 panel in `Preview.tsx`). They register into `Store.dataSources` and behave like real tables for `Filter/LookUp/Sort/Search/Patch/Collect/Remove` — including minting `ID`/GUID on insert.
- **Connectors** register into `Store.connectors` as namespace objects so `Office365Users.MyProfile()` etc. resolve. `Office365Users` and `Office365Outlook` are built in; others come from `connectorResponses` (canned results). Side-effecting calls are logged to `Store.outbox`.
- The Power Fx engine (`utils/powerfx.ts`) was extended: parser supports `Namespace.Operation(args)` (`mcall` node); `resolve()` surfaces a data source as its rows; mutation funcs route through `targetTable()`.
- Full design + the connector model mined from the portal: `aidocs/local-first-renderer.md`. Runnable example: `examples/connected-app/`.

## 💾 Persistence & Backend
- **Supabase**: Used for storing user workspaces, apps, screens, and uploaded images. Logic is located in `src/lib/database.ts`.
- **Clerk**: Handles user authentication. Profile info is integrated into the PowerFx context (e.g., `User().Email`).
- **Images**: Named images in YAML are resolved against the `app_images` table in Supabase.

---

## 🖥️ Development
- **Local Dev**: `npm run dev`
- **Testing**: Built-in validation panel shows issues in the side inspector (Properties Panel).
