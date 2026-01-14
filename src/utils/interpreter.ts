// PowerAppControl is not used here, removing import


export type PowerFxContextState = Record<string, any>;

/**
 * Executes a Power Fx action string (e.g. from OnSelect).
 * Returns the new state.
 */
export const executePowerFxAction = (
    expression: string,
    currentState: PowerFxContextState,
    navigationCallback?: (screenName?: string) => void
): PowerFxContextState => {
    let newState = { ...currentState };
    let expr = expression.trim();

    if (expr.startsWith('=')) {
        expr = expr.substring(1).trim();
    }

    // Split by chaining operators: ';' or '&&'
    // This is a naive split that doesn't respect quotes/parentheses well, 
    // but sufficient for the provided example: Set(...); Set(...) or Set(...) && Set(...)
    // We need a regex that splits by ; or && but ignores them inside parens.
    const actions = splitActions(expr);

    for (const action of actions) {
        const cleanAction = action.trim();
        if (!cleanAction) continue;

        // MATCH: Set(VarName, Value)
        const setMatch = cleanAction.match(/^Set\(\s*([a-zA-Z0-9_]+)\s*,\s*(.+)\s*\)$/);
        if (setMatch) {
            const varName = setMatch[1];
            const rawValue = setMatch[2];
            const evaluatedValue = evaluateExpression(rawValue, newState);
            newState[varName] = evaluatedValue;
            continue;
        }

        // MATCH: UpdateContext({VarName: Value})
        // Simplified: assumes single variable or simple object syntax
        const updatesMatch = cleanAction.match(/^UpdateContext\(\{(.+)\}\)$/);
        if (updatesMatch) {
            const content = updatesMatch[1];
            // Split by comma for multiple updates: Var1: Val1, Var2: Val2
            // Again, naive split
            const pairs = splitTopLevel(content, ',');
            for (const pair of pairs) {
                const [key, val] = splitTopLevel(pair, ':');
                if (key && val) {
                    const varName = key.trim();
                    const evaluatedValue = evaluateExpression(val.trim(), newState);
                    newState[varName] = evaluatedValue;
                }
            }
            continue;
        }

        // MATCH: Back()
        if (cleanAction === 'Back()') {
            if (navigationCallback) navigationCallback();
            continue;
        }

        // MATCH: Notify(Msg, Type)
        if (cleanAction.startsWith('Notify(')) {
            // Just log it
            console.log('Notify Action:', cleanAction);
            continue;
        }

        // MATCH: Navigate(Screen)
        const navMatch = cleanAction.match(/^Navigate\(\s*([a-zA-Z0-9_]+)\s*\)$/);
        if (navMatch && navigationCallback) {
            navigationCallback(navMatch[1]);
            continue;
        }

        // If it's a simple assignment/expression without side effect wrapper? 
        // PowerApps doesn't allow just "x = 1". Must be Set.
        // But maybe the user provided just an expression?
        // We ignore unknown side effects.
    }

    return newState;
};

/**
 * Evaluates a return value expression (e.g. Visible: =varBool).
 */
export const evaluateExpression = (expression: string, context: PowerFxContextState): any => {
    let expr = expression.trim();
    if (expr.startsWith('=')) {
        expr = expr.substring(1).trim();
    }

    // 1. Boolean Literals
    if (expr.toLowerCase() === 'true') return true;
    if (expr.toLowerCase() === 'false') return false;

    // 2. String Literals
    if (expr.startsWith('"') && expr.endsWith('"')) {
        return expr.substring(1, expr.length - 1);
    }

    // 3. Numeric Literals
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
        return parseFloat(expr);
    }

    // 4. Variable Lookup
    // If it's a simple identifier and exists in context
    if (/^[a-zA-Z0-9_]+$/.test(expr)) {
        if (context[expr] !== undefined) {
            return context[expr];
        }
        // If not in context, maybe it's a known global or enum we don't track?
        // E.g. DisplayMode.Edit -> return string "DisplayMode.Edit" or something
        return expr;
    }

    // 5. Logic Operators: Or(), And(), Not(), !
    // Handle "!" prefix
    if (expr.startsWith('!')) {
        const subExpr = expr.substring(1).trim();
        return !evaluateExpression(subExpr, context);
    }

    // Function Calls
    const funcMatch = expr.match(/^([a-zA-Z0-9_]+)\((.*)\)$/);
    if (funcMatch) {
        const fnName = funcMatch[1].toLowerCase();
        const argsStr = funcMatch[2];
        const args = splitTopLevel(argsStr, ',').map(a => evaluateExpression(a.trim(), context));

        switch (fnName) {
            case 'or':
                return args.some(a => Boolean(a) === true);
            case 'and':
                return args.every(a => Boolean(a) === true);
            case 'not':
                return !args[0];
            case 'if':
                // If(Cond, TrueVal, FalseVal)
                if (args[0]) return args[1];
                return args[2];
            default:
                // Fallback: return raw
                return expr;
        }
    }

    // 6. Inline Logic: A && B, A || B, A = B
    // Handle strict equality "="
    if (expr.includes('=')) {
        // Naive check for "State.Value = 'Borrador'"
        // We won't fully parse object access yet, but let's handle simple A=B
        const parts = splitTopLevel(expr, '=');
        if (parts.length === 2) {
            const lhs = evaluateExpression(parts[0], context);
            const rhs = evaluateExpression(parts[1], context);
            return lhs == rhs;
        }
    }

    return expr;
};


// Helper: Split by delimiter, ignoring quotes and parens/braces
const splitTopLevel = (str: string, delimiter: string): string[] => {
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let parenDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (!inQuote) {
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
            else if (char === '{') braceDepth++;
            else if (char === '}') braceDepth--;
        }

        if (char === delimiter && !inQuote && parenDepth === 0 && braceDepth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts;
};

// Helper to split actions by ; or &&
const splitActions = (str: string): string[] => {
    // We want to split by ';' OR '&&'
    // But we need to be careful.
    // Let's normalize '&&' to ';' for splitting purposes? No, that modifies content.
    // We can use the same splitTopLevel logic but check for multiple delimiters.

    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (!inQuote) {
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
        }

        let isDelimiter = false;
        let delimLength = 0;

        if (!inQuote && parenDepth === 0) {
            if (char === ';') {
                isDelimiter = true;
                delimLength = 1;
            } else if (char === '&' && str[i + 1] === '&') {
                isDelimiter = true;
                delimLength = 2;
            }
        }

        if (isDelimiter) {
            parts.push(current);
            current = '';
            if (delimLength === 2) i++; // skip second &
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts;
};
