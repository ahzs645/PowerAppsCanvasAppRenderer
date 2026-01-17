// PowerAppControl is not used here, removing import


export type PowerFxContextState = Record<string, any>;

/**
 * Executes a Power Fx action string (e.g. from OnSelect).
 * Returns the new state.
 */
export const executePowerFxAction = (
    expression: string,
    currentState: PowerFxContextState,
    evaluationContext: PowerFxContextState, // Full context including dataSources
    navigationCallback?: (screenName?: string) => void,
    notifyCallback?: (message: string) => void
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
            // console.log(`[DEBUG] executePowerFxAction: Set(${varName}, ${rawValue})`);
            // Use evaluationContext merged with current session's new variables
            const evaluatedValue = evaluateExpression(rawValue, { ...evaluationContext, ...newState });
            // console.log(`[DEBUG] executePowerFxAction: Set(${varName}) evaluated to:`, evaluatedValue);
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
                    const evaluatedValue = evaluateExpression(val.trim(), { ...evaluationContext, ...newState });
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
        const notifyMatch = cleanAction.match(/^Notify\(\s*(.+)\s*\)$/);
        if (notifyMatch) {
            const rawMsg = notifyMatch[1].split(',')[0].trim();
            const msg = evaluateExpression(rawMsg, { ...evaluationContext, ...newState });
            if (notifyCallback) notifyCallback(String(msg));
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
    if (typeof expression !== 'string') return expression;
    let expr = expression.trim();

    // 1. Strip leading '=' if present
    if (expr.startsWith('=')) {
        expr = expr.substring(1).trim();
    }
    // console.log(`[DEBUG] Evaluating Expression: ${expr}`)
    // 2. If it's a raw Data URI for an SVG (no quotes), extract and decode
    if (expr.startsWith('"data:image/svg+xml')) {
        const commaIndex = expr.indexOf(',');
        console.log(`[DEBUG] Found commaIndex: ${commaIndex}`)
        if (commaIndex !== -1) {
            const startIndex = expr.indexOf('%');
            const rawData = expr.substring(startIndex);
            console.log(`[DEBUG] Found rawData: ${rawData}`)
            try {
                return decodeURIComponent(rawData);
            } catch (e) {
                return rawData;
            }
        }
    }

    // 3. Otherwise, evaluate as normal
    let result = _evaluateExpressionInternal(expr, context);

    const isDataUri = typeof result === 'string' && (result.startsWith('data:') || result.startsWith('"data:'));
    if (isDataUri) return result;

    // 4. Wrap math expressions in calc()
    // Skip if it is a Data URI or an SVG
    if (typeof result === 'string' && !isDataUri && (result.includes('%') || result.includes('px')) && /[+\-*/]/.test(result) && !result.startsWith('calc(')) {
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


    // 2. Data URI Literal (Raw)
    if (expr.startsWith('data:') || expr.startsWith('"data:')) return expr;

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

    // 3. Double-Quoted String Literals (PowerFx Strings)
    if (expr.startsWith('"') && expr.endsWith('"')) {
        return expr.substring(1, expr.length - 1).replace(/""/g, '"');
    }

    // Interpolated String: $"..."
    if (expr.startsWith('$"') && expr.endsWith('"')) {
        let content = expr.substring(2, expr.length - 1).replace(/""/g, '"');
        return content.replace(/\{([\s\S]*?)\}/g, (_match, formula) => {
            return String(evaluateExpression(formula.trim(), context));
        });
    }

    // 4. Numeric Literals with Units (Atomic)
    const unitMatch = expr.match(/^(-?\d+(\.\d+)?)(px|%|pt|em|rem)?$/);
    if (unitMatch) {
        if (unitMatch[3]) return expr;
        return parseFloat(unitMatch[1]);
    }

    // 5. Logic Operators: &&, ||, !
    const logicOps = ['&&', '||'];
    for (const op of logicOps) {
        const parts = splitTopLevel(expr, op);
        if (parts.length > 1) {
            if (op === '&&') return parts.every(p => Boolean(evaluateExpression(p.trim(), context)));
            if (op === '||') return parts.some(p => Boolean(evaluateExpression(p.trim(), context)));
        }
    }
    if (expr.startsWith('!')) {
        const subExpr = expr.substring(1).trim();
        return !evaluateExpression(subExpr, context);
    }

    // 6. Equality and Comparisons: =, <>, <, >, <=, >=
    const cmpOps = ['=', '<>', '<=', '>=', '<', '>'];
    for (const op of cmpOps) {
        // splitTopLevel handles finding the operator outside of parens/quotes.
        const parts = splitTopLevel(expr, op);
        if (parts.length === 2) {
            const lhs = evaluateExpression(parts[0].trim(), context);
            const rhs = evaluateExpression(parts[1].trim(), context);
            switch (op) {
                case '=': return (String(lhs) === String(rhs)); // Coerce to string for simple comparison
                case '<>': return (String(lhs) !== String(rhs));
                case '<=': return (parseFloat(lhs) <= parseFloat(rhs));
                case '>=': return (parseFloat(lhs) >= parseFloat(rhs));
                case '<': return (parseFloat(lhs) < parseFloat(rhs));
                case '>': return (parseFloat(lhs) > parseFloat(rhs));
            }
        }
    }

    // 7. Concatenation: &
    if (expr.includes('&') && !expr.includes('&&')) {
        const ampParts = splitTopLevel(expr, '&');
        if (ampParts.length > 1) {
            return ampParts.map(p => String(evaluateExpression(p.trim(), context))).join('');
        }
    }

    // 8. Arithmetic: +, -, *, /
    if (/[+\-*/]/.test(expr) && !expr.startsWith('data:') && !expr.startsWith('"data:')) {
        if (/\d/.test(expr) || expr.includes('Parent.') || expr.includes('Self.')) {
            return evaluateArithmetic(expr, context);
        }
    }

    // 9. Dot notation Lookup / Property Access: Object.Property
    if (expr.includes('.')) {
        const dotIndex = findLastTopLevelDot(expr);
        if (dotIndex !== -1) {
            const lhs = expr.substring(0, dotIndex).trim();
            const rhs = expr.substring(dotIndex + 1).trim();

            const obj = evaluateExpression(lhs, context);
            const cleanRhs = rhs.startsWith("'") && rhs.endsWith("'") ? rhs.slice(1, -1).replace(/''/g, "'") : rhs;

            if (obj && typeof obj === 'object') {
                const val = (obj as any)[cleanRhs];
                return val !== undefined ? val : expr;
            }
        }
    }

    // 10. Function Calls: Func(...)
    const funcMatch = expr.match(/^([a-zA-Z0-9_\u00c0-\u017f ]+)\(([\s\S]*)\)$/);
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
            case 'filter': {
                const source = args[0];
                // console.log(`[DEBUG] Filter: source is`, source);
                if (!Array.isArray(source)) {
                    // console.warn(`[DEBUG] Filter: source is not an array!`);
                    return [];
                }

                const rawArgs = splitTopLevel(argsStr, ',');
                if (rawArgs.length < 2) return source;

                const conditions = rawArgs.slice(1);
                // console.log(`[DEBUG] Filter: conditions are`, conditions);

                const result = source.filter((item) => {
                    // Evaluate each condition with the item as context (ThisItem)
                    const match = conditions.every(cond => {
                        const evalResult = evaluateExpression(cond.trim(), { ...context, ThisItem: item, ...item });
                        return Boolean(evalResult) === true;
                    });
                    return match;
                });
                // console.log(`[DEBUG] Filter: result has ${result.length} items`);
                return result;
            }
            case 'user':
                // Return a mock user object if not provided in context
                return context.User || {
                    Email: "mock@example.com",
                    FullName: "Mock User",
                    Image: ""
                };
            case 'countrows':
                const count = Array.isArray(args[0]) ? args[0].length : 0;
                // console.log(`[DEBUG] CountRows: arg is`, args[0], `count is`, count);
                return count;
            case 'split': {
                const text = String(args[0] || "");
                const sep = String(args[1] || "");
                return text.split(sep).map(s => ({ Result: s, Value: s }));
            }
            case 'first': {
                const list = args[0];
                if (Array.isArray(list) && list.length > 0) {
                    return list[0];
                }
                return { Result: "", Value: "" };
            }
            case 'encodeurl':
                return encodeURIComponent(String(args[0] || ""));
            default:
                return expr;
        }
    }

    // 11. Simple Identifier / Variable Lookup
    const isQuotedIdentifier = expr.startsWith("'") && expr.endsWith("'");
    const cleanId = isQuotedIdentifier ? expr.slice(1, -1).replace(/''/g, "'") : expr;

    // Use a regex that requires at least one letter for unquoted identifiers
    if (isQuotedIdentifier || /^[a-zA-Z_\u00c0-\u017f][a-zA-Z0-9_\u00c0-\u017f ]*$/.test(expr)) {
        if (context[cleanId] !== undefined) {
            return context[cleanId];
        }
        if (isQuotedIdentifier) {
            // console.log(`[DEBUG] Quoted identifier [${cleanId}] not found in context keys:`, Object.keys(context));
            return undefined;
        }
        return expr; // Fallback to raw string if not found (might be a property name or literal)
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
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let parenDepth = 0;
    let lastDot = -1;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && !inSingleQuote) {
            if (inDoubleQuote && str[i + 1] === '"') {
                i++; // skip next quote
                continue;
            }
            inDoubleQuote = !inDoubleQuote;
        } else if (char === "'" && !inDoubleQuote) {
            if (inSingleQuote && str[i + 1] === "'") {
                i++; // skip next quote
                continue;
            }
            inSingleQuote = !inSingleQuote;
        } else if (!inDoubleQuote && !inSingleQuote) {
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
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let parenDepth = 0;
    let braceDepth = 0;

    const delimLen = delimiter.length;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && !inSingleQuote) {
            if (inDoubleQuote && str[i + 1] === '"') {
                current += '"';
                i++; // skip next quote
                continue;
            }
            inDoubleQuote = !inDoubleQuote;
        } else if (char === "'" && !inDoubleQuote) {
            if (inSingleQuote && str[i + 1] === "'") {
                current += "'";
                i++; // skip next quote
                continue;
            }
            inSingleQuote = !inSingleQuote;
        } else if (!inDoubleQuote && !inSingleQuote) {
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
            else if (char === '{') braceDepth++;
            else if (char === '}') braceDepth--;
        }

        // Check for delimiter
        const isDelim = !inDoubleQuote && !inSingleQuote && parenDepth === 0 && braceDepth === 0 &&
            str.substring(i, i + delimLen) === delimiter;

        if (isDelim) {
            // Guard: If we are splitting by '&', don't split if it's '&&'
            if (delimiter === '&' && str[i + 1] === '&') {
                current += char;
                continue;
            }
            if (delimiter === '&' && i > 0 && str[i - 1] === '&') {
                current += char;
                continue;
            }

            parts.push(current);
            current = '';
            i += delimLen - 1; // skip rest of delimiter
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts;
};

// Helper to split actions by ; or &&
const splitActions = (str: string): string[] => {
    const parts: string[] = [];
    let current = '';
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && !inSingleQuote) {
            if (inDoubleQuote && str[i + 1] === '"') {
                current += '"';
                i++; // skip next quote
                continue;
            }
            inDoubleQuote = !inDoubleQuote;
        } else if (char === "'" && !inDoubleQuote) {
            if (inSingleQuote && str[i + 1] === "'") {
                current += "'";
                i++; // skip next quote
                continue;
            }
            inSingleQuote = !inSingleQuote;
        } else if (!inDoubleQuote && !inSingleQuote) {
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
        }

        let isDelimiter = false;
        let delimLength = 0;

        if (!inDoubleQuote && !inSingleQuote && parenDepth === 0) {
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
