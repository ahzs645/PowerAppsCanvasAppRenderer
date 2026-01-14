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

export const evaluateExpression = (expression: string, context: PowerFxContextState): any => {
    // 1. If the input is a raw Data URI for an SVG, extract and decode just the SVG content
    if (typeof expression === 'string' && expression.startsWith('data:image/svg+xml')) {
        // console.log(`[DEBUG] evaluateExpression: raw data URI detected, extracting SVG`);

        const commaIndex = expression.indexOf(',');
        if (commaIndex !== -1) {
            const rawData = expression.substring(commaIndex + 1);
            try {
                // decodeURIComponent turns %3Csvg into <svg
                return decodeURIComponent(rawData);
            } catch (e) {
                // console.error("Failed to decode SVG data", e);
                return rawData; // Fallback to raw if decoding fails
            }
        }
        return expression;
    }

    // 2. Otherwise, evaluate as normal
    let result = _evaluateExpressionInternal(expression, context);

    // 3. Check result (in case a formula returned a string)
    const isDataUri = typeof result === 'string' && (result.startsWith('data:') || result.startsWith('"data:'));
    if (isDataUri) return result;

    // 4. Wrap math expressions in calc()
    if (typeof result === 'string' && (result.includes('%') || result.includes('px')) && /[+\-*/]/.test(result) && !result.startsWith('calc(')) {
        if (/\d+(px|%)\s*[+\-*/]/.test(result)) {
            result = `calc(${result})`;
        }
    }

    if (expression.includes('Parent.Width') || expression.includes('Self.Width')) {
        // console.log(`[DEBUG] evaluateExpression: expr="${expression}", result="${result}"`);
    }

    return result;
};

const _evaluateExpressionInternal = (expression: string, context: PowerFxContextState): any => {
    let expr = expression.trim();
    if (expr.startsWith('=')) {
        expr = expr.substring(1).trim();
    }

    if (!expr) return expr;

    // 1. Handle calc() wrapper (often comes from parser.ts)
    if (expr.toLowerCase().startsWith('calc(') && expr.endsWith(')')) {
        expr = expr.substring(5, expr.length - 1).trim();
    }

    // Strip top-level parentheses if they wrap the entire expression
    while (expr.startsWith('(') && expr.endsWith(')')) {
        // Only strip if they are matching: (A) + (B) should not be stripped to A) + (B
        let depth = 0;
        let mismatch = false;
        for (let i = 0; i < expr.length - 1; i++) {
            if (expr[i] === '(') depth++;
            else if (expr[i] === ')') depth--;
            if (depth === 0) {
                mismatch = true;
                break;
            }
        }
        if (!mismatch) {
            expr = expr.substring(1, expr.length - 1).trim();
        } else {
            break;
        }
    }

    // 2. Boolean Literals
    if (expr.toLowerCase() === 'true') return true;
    if (expr.toLowerCase() === 'false') return false;

    // 3. String Literals
    if (expr.startsWith('"') && expr.endsWith('"')) {
        return expr.substring(1, expr.length - 1);
    }

    // Interpolated Strings: $"..."
    if (expr.startsWith('$"') && expr.endsWith('"')) {
        return expr.substring(2, expr.length - 1);
    }

    // 4. Concatenation: & (lower precedence than math in some contexts, but here we handle it explicitly)
    // We split by & but skip && (handled by splitActions)
    const ampParts = splitTopLevel(expr, '&');
    if (ampParts.length > 1) {
        return ampParts.map(p => {
            const part = p.trim();
            // If it's &&, evaluate it as logic? No, splitActions handled top-level &&.
            // But internal && might still exist. However, single & is usually concatenation.
            return String(evaluateExpression(part, context));
        }).join('');
    }

    // 4. Numeric Literals with Units
    const unitMatch = expr.match(/^(-?\d+(\.\d+)?)(px|%|pt|em|rem)?$/);
    if (unitMatch) {
        if (unitMatch[3]) return expr; // Preserve string if unit is present
        return parseFloat(unitMatch[1]);
    }

    // 5. Dot notation Lookup / Property Access: Object.Property
    if (expr.includes('.')) {
        const dotIndex = findLastTopLevelDot(expr);
        if (dotIndex !== -1) {
            const lhs = expr.substring(0, dotIndex).trim();
            const rhs = expr.substring(dotIndex + 1).trim();

            const obj = evaluateExpression(lhs, context);
            if (obj && typeof obj === 'object') {
                return obj[rhs] !== undefined ? obj[rhs] : expr;
            }
        }
    }

    // 6. Variable / Control Lookup
    if (/^[a-zA-Z0-9_]+$/.test(expr)) {
        if (context[expr] !== undefined) {
            return context[expr];
        }
        return expr;
    }

    // 7. Arithmetic: +, -, *, /
    if (/[+\-*/]/.test(expr)) {
        return evaluateArithmetic(expr, context);
    }

    // 8. Logic Operators: Or(), And(), Not(), !
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
                if (args[0]) return args[1];
                return args[2];
            case 'encodeurl':
                return encodeURIComponent(String(args[0] || ""));
            default:
                return expr;
        }
    }

    // 9. Inline Logic: A && B, A || B, A = B
    if (expr.includes('=')) {
        const parts = splitTopLevel(expr, '=');
        if (parts.length === 2) {
            const lhs = evaluateExpression(parts[0], context);
            const rhs = evaluateExpression(parts[1], context);
            return (lhs == rhs);
        }
    }

    return expr;
};


/**
 * Basic arithmetic evaluator for +, -, *, /
 */
/**
 * Basic arithmetic evaluator for +, -, *, /
 * Now unit-aware: if operands contain units (%, px), it returns a string for CSS calc().
 */
const evaluateArithmetic = (expression: string, context: PowerFxContextState): any => {
    const processOp = (parts: string[], op: string, identity: number, calcFn: (a: number, b: number) => number) => {
        let hasUnit = false;
        const evaluated = parts.map(p => {
            const val = evaluateExpression(p.trim(), context);
            if (typeof val === 'string' && (val.includes('%') || val.includes('px') || val.includes('calc') || val.includes('('))) {
                hasUnit = true;
            }
            return val;
        });

        if (hasUnit) {
            const joined = evaluated.map(v => {
                // If it's a number, it's likely a dimension. 
                // In CSS calc, addition/subtraction must have units on BOTH sides or be unitless.
                // Multiplication/Division must have one unitless side.
                if (typeof v === 'number') {
                    return (op === '+' || op === '-') ? `${v}px` : v.toString();
                }
                return v;
            }).join(` ${op} `);
            return `(${joined})`;
        }

        return evaluated.reduce((acc, val, i) => {
            const nAcc = Number(acc) || 0;
            const nVal = Number(val) || 0;
            return i === 0 ? nVal : calcFn(nAcc, nVal);
        }, identity);
    };

    // Handle Addition/Subtraction first (lowest precedence)
    const addParts = splitTopLevel(expression, '+');
    if (addParts.length > 1) return processOp(addParts, '+', 0, (a, b) => a + b);

    const subParts = splitTopLevel(expression, '-');
    if (subParts.length > 1) return processOp(subParts, '-', 0, (a, b) => a - b);

    // Handle Multiplication/Division (higher precedence)
    const mulParts = splitTopLevel(expression, '*');
    if (mulParts.length > 1) return processOp(mulParts, '*', 1, (a, b) => a * b);

    const divParts = splitTopLevel(expression, '/');
    if (divParts.length > 1) return processOp(divParts, '/', 0, (a, b) => b === 0 ? 0 : a / b);

    return expression;
};

/**
 * Helper: Find last dot, ignoring parens
 */
const findLastTopLevelDot = (str: string): number => {
    let inQuote = false;
    let parenDepth = 0;
    let lastDot = -1;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') inQuote = !inQuote;
        else if (!inQuote) {
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
            else if (char === '.' && parenDepth === 0) lastDot = i;
        }
    }
    return lastDot;
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
