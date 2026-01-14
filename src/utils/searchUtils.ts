/**
 * Recursively searches the control tree for any property values that contain the given variable name.
 * Returns a Set of ControlNames.
 */
export const findControlsUsingVariable = (data: any, variableName: string): Set<string> => {
    const found = new Set<string>();

    if (!data || !variableName) return found;

    // Helper to process a single node recursively
    const traverse = (node: any) => {
        if (!node) return;

        // Check properties of the current node
        let matches = false;

        // We iterate over keys. Note that some keys are metadata (ControlName, As, etc.)
        // But checking them usually doesn't hurt as they won't match a variable name typically.
        // We really care about formula string values.
        for (const key in node) {
            if (key === '_Children') continue;

            const value = node[key];
            if (typeof value === 'string') {
                // Heuristic regex to match full word variable name
                // matches "varName", "!varName", "Set(varName...)"
                const regex = new RegExp(`\\b${variableName}\\b`);
                if (regex.test(value)) {
                    matches = true;
                    // We can break early if we just want to know if the control uses it
                    // But maybe we want to know WHICH property? For now just the control.
                    break;
                }
            }
        }

        if (matches && node.ControlName) {
            found.add(node.ControlName);
        }

        // Recurse children
        if (node._Children && Array.isArray(node._Children)) {
            node._Children.forEach((child: any) => traverse(child));
        } else if (data !== node && node.Screens) {
            // Handle root object structure if passed directly
            Object.values(node.Screens).forEach((screen: any) => traverse(screen));
        }
    };

    // Handle the root structure which might be { Screen1: ..., Screen2: ... }
    // Or just a single control node.
    // The parsedData from App.tsx is usually { Screen1: {...}, Screen2: {...} }

    if (data.Screens) {
        // Raw YAML object structure
        // We usually work with the processed structure where keys are screen names
        Object.values(data.Screens).forEach((screen: any) => traverse(screen));
    } else {
        // Processed structure: { Screen1: {...}, ... }
        Object.values(data).forEach((screen: any) => traverse(screen));
    }

    return found;
};
