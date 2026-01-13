# Codebase Walkthrough for Agents

## Project Overview
This is a **React + Vite** application designed to render **PowerApps Canvas Apps** directly from their YAML source code.

## Key Workflows
1. **Parsing**: The app reads YAML, parses it into JSON, and normalizes it.
2. **Rendering**: The normalized JSON is traversed to render React components matching the PowerApps controls.

## Critical Files

### 1. `src/utils/parser.ts`
**Functionality**: Core parsing logic.
- **`parsePowerYAML(yamlStr)`**: Entry point. Detects if the YAML is in the "New Format" (with `Screens` key) or "Legacy Format".
- **`normalizeControlSource`**: Converts a control node into a standard internal structure.
    - Maps `Control: Type@Version` to `As: type`.
    - Handles `Children` recursively.
- **`processValue(value)`**: Pre-processes property values.
    - Strips leading `=`.
    - Handles `Parent.Width/Height` replacements.
    - **Note**: This is where formula logic (like `EncodeUrl` or `RGBA`) needs to be handled.
    - **`AutoLayout` Handling**:
        - Detects `Variant: AutoLayout`.
        - Automatically calculates `Width` (for Horizontal) or `Height` (for Vertical) for children based on parent size, padding, and gap.
        - Injects `X` and `Y` properties to children to enforce the layout (since the renderer uses absolute positioning).

### 2. `src/components/ControlMapper.tsx`
**Functionality**: Recursive component renderer.
- Takes a `control` object.
- Uses `control.As` to decide which component to render (e.g., `LabelRenderer`, `ImageRenderer`).
- Renders `_Children` recursively.

### 3. `src/components/renderers/BasicRenderers.tsx`
**Functionality**: Implementation of individual controls (Label, Image, etc.).

## Common Tasks
- **Adding a new control**:
  1. Create renderer in `BasicRenderers.tsx` (or new file).
  2. Register in `ControlMapper.tsx`.
- **Improving Parsing**:
  1. Modify `src/utils/parser.ts` to handle new formula patterns.

## Development
- Run `npm run dev` to start the local server.
