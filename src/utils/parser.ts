import yaml from 'js-yaml';

export interface PowerAppControl {
    As: string;
    [key: string]: any;
    _Children?: PowerAppControl[];
}

/**
 * Strips metadata blocks like _Dependencies and _Properties from the parsed YAML.
 * Also recursively cleans up children from the LEGACY format.
 */
export const stripMetadata = (data: any): any => {
    if (!data || typeof data !== 'object') return data;

    const cleanData: any = {};

    for (const key in data) {
        if (key === '_Dependencies' || key === '_Properties') continue;

        if (Array.isArray(data[key])) {
            cleanData[key] = data[key].map(stripMetadata);
        } else if (typeof data[key] === 'object') {
            cleanData[key] = stripMetadata(data[key]);
        } else {
            cleanData[key] = data[key];
        }
    }

    return cleanData;
};

/**
 * Processes formula values. If a value starts with '=', it returns a placeholder [ƒx Formula] (or the value itself if we just want to show it).
 * For now, we keep the original string or strip the '=' for display if needed.
 * But the renderer usually expects raw values.
 */
/**
 * Processes formula values.
 * Handles `Parent.Height`, `Self.Height`, recursive references, and generating CSS `calc()`.
 */
const USER_CONTEXT = {
    FullName: "User Testing User",
    Email: "testing@email.com",
    Image: ""
};

/**
 * Basic PowerFx formula evaluator for string manipulation and data context.
 * Supports: &, User(), Split(), First(), .Property
 */
const evaluatePowerFx = (expression: string): any => {
    // Top level: Split by '&' for string concatenation
    // We need to split by & but ignore & inside quotes or parens.
    const parts = splitTopLevel(expression, '&');
    if (parts.length > 1) {
        return parts.map(p => evaluatePowerFx(p)).join('');
    }

    let expr = expression.trim();

    // String Literal
    if (expr.startsWith('"') && expr.endsWith('"')) {
        return expr.substring(1, expr.length - 1);
    }

    // Property Access: Object.Property
    // We need to find the last '.' that is NOT in parens.
    // e.g. First(Split(...)).Value
    const dotIndex = findLastTopLevelDot(expr);
    if (dotIndex !== -1) {
        const lhs = expr.substring(0, dotIndex).trim();
        const rhs = expr.substring(dotIndex + 1).trim();

        const obj = evaluatePowerFx(lhs);
        if (obj && typeof obj === 'object') {
            return obj[rhs] || "";
        }
        return "";
    }

    // Function Call: Name(Args)
    const functionMatch = expr.match(/^([a-zA-Z0-9_]+)\((.*)\)$/);
    if (functionMatch) {
        const fnName = functionMatch[1].toLowerCase();
        const argsStr = functionMatch[2];
        const args = splitTopLevel(argsStr, ',').map(a => evaluatePowerFx(a));

        switch (fnName) {
            case 'user':
                return USER_CONTEXT;
            case 'split':
                // Split(Text, Separator) -> Table [{Result: "..."}]
                const text = String(args[0] || "");
                const sep = String(args[1] || "");
                return text.split(sep).map(s => ({ Result: s, Value: s })); // Support both .Result and .Value
            case 'first':
                // First(Table)
                const list = args[0];
                if (Array.isArray(list) && list.length > 0) {
                    return list[0];
                }
                return { Result: "", Value: "" }; // Safe fallback
            default:
                return expr;
        }
    }

    // Identifier / Fallback
    // Could be a context variable if we had them, but for now just return as is or look up USER_CONTEXT?
    // User() is a function.
    return expr;
};

// Helper: Split by delimiter, ignoring quotes and parens
const splitTopLevel = (str: string, delimiter: string): string[] => {
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

        if (char === delimiter && !inQuote && parenDepth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts;
};

// Helper: Find last dot, ignoring parens
const findLastTopLevelDot = (str: string): number => {
    let inQuote = false;
    let parenDepth = 0;

    // Scan backwards
    // Scan backwards
    // (Unused backward scan removed)

    // Forward scan

    // Forward scan
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

/**
 * Processes formula values.
 * Handles `Parent.Height`, `Self.Height`, recursive references, and generating CSS `calc()`.
 */
const processValue = (value: any, context: any = {}, key?: string): any => {
    if (typeof value !== 'string') return value;

    let cleanValue = value.trim();
    if (cleanValue.startsWith('=')) {
        cleanValue = cleanValue.substring(1).trim();
    }

    // SKIP for Action properties (OnSelect, OnVisible, OnChange, etc.)
    // We want the runtime interpreter to handle these, not the build-time parser.
    if (key && (key.startsWith('On') || key === 'Visible')) { // Visible is also dynamic usually, but currently handled via logic? 
        // Actually Visible might be "=true" or "=varBool". 
        // If we skip processing, we return string "varBool". 
        // ControlMapper then calls evaluateExpression("varBool").
        // But if processValue evaluates it now, it tries to look it up in context?
        // normalizeControlSource context is just the properties of the control itself + sibling props maybe?
        // It does NOT have the runtime global variables.
        // So for ANY property that depends on runtime variables (which we don't know at parse time), 
        // we should probably return it as a raw string or formula.

        // HOWEVER, parser.ts attempts to resolve layout formulas like Parent.Width.
        // We shouldn't break that. 
        // But OnVisible/OnSelect definitely shouldn't be touched by the simplistic evaluatePowerFx.
        if (key.startsWith('On')) {
            return value; // Return original with '=' for interpreter
        }
    }

    // 1. Handle Simple Strings (Quotes)
    if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
        return cleanValue.substring(1, cleanValue.length - 1);
    }

    // 2. Handle numeric values directly
    if (/^-?\d+(\.\d+)?$/.test(cleanValue)) {
        return parseFloat(cleanValue);
    }

    // 3. Handle Special Functions
    // SVG EncodeUrl
    if (cleanValue.includes('EncodeUrl(')) {
        const encodedMatch = cleanValue.match(/EncodeUrl\(\$?"((?:[^"\\]|\\.)*)"\)/);
        if (encodedMatch && encodedMatch[1]) {
            let svgContent = encodedMatch[1].replace(/\\"/g, '"');
            return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
        }
    }

    // RGBA
    if (cleanValue.toUpperCase().startsWith('RGBA(')) {
        // Return as is for CSS to handle (lowercase)
        return cleanValue.toLowerCase();
    }

    // Color Constants
    if (cleanValue.startsWith('Color.')) {
        return cleanValue.split('.')[1].toLowerCase();
    }

    // Handle Enums like LayoutDirection.Horizontal
    if (cleanValue.includes('LayoutDirection.')) {
        return cleanValue.split('.')[1];
    }
    if (cleanValue.includes('LayoutAlignItems.')) {
        return cleanValue.split('.')[1];
    }

    // 5. PowerFx Data/String Formulas (User, Split, First, &)
    // Avoid evaluating if it looks like logic (&&, ||) which evaluatePowerFx messes up
    const hasLogic = cleanValue.includes('&&') || cleanValue.includes('||');
    if (!hasLogic && (cleanValue.includes('User(') || cleanValue.includes('First(') || cleanValue.includes('Split(') || cleanValue.includes('&'))) {
        return evaluatePowerFx(cleanValue);
    }

    // 4. Formula Parsing for Layout Properties
    // We want to turn "Parent.Height / 2 - Self.Height / 2" into "calc(100% / 2 - 50px)"
    // This requires tokenizing and identifying terms.

    // Check if it looks like a math expression or property reference
    if (/[+\-*/]/.test(cleanValue) || cleanValue.includes('Parent.') || cleanValue.includes('Self.')) {
        // Fix Unary Minus: "- (Self.Height / 2)" -> "0px - (Self.Height / 2)" to satisfy calc subtraction syntax
        if (cleanValue.trim().startsWith('-')) {
            cleanValue = '0px ' + cleanValue;
        }
        return parseFormulaToCSS(cleanValue, context);
    }

    return cleanValue;
};

/**
 * Converts a Power Apps math formula into a CSS calc() string.
 */
const parseFormulaToCSS = (formula: string, context: any): string | number => {
    // 1. Replace Parent References
    let cssExpression = formula
        .replace(/Parent\.Width/gi, '100%')
        .replace(/Parent\.Height/gi, '100%');

    // 2. Replace Self References
    // We need to look up the value in the context (the control's own properties)
    // "Self.Width" -> Look for 'Width' in context
    cssExpression = cssExpression.replace(/Self\.([a-zA-Z0-9_]+)/gi, (_, propName) => {
        if (context && context[propName] !== undefined) {
            // We have the raw value from the context.
            // It might be a number (100) or a string ("100") or a formula ("Parent.Width * 0.5")
            // We need to resolve it recursively, effectively.
            // BUT, for simplicity in this pass, let's assume Self refers to static numbers or we take it as is.
            // Infinite recursion is a risk if Self.Width refers to Width which refers into Self.Width.
            // Power Apps usually prevents circular deps.
            // For the user request "Self.Height", usually Height is a fixed number or simple value on the node.

            const val = context[propName];
            // If it matches a number, return it.
            if (typeof val === 'number' || /^\d+$/.test(val)) {
                return val.toString(); // We'll add 'px' later if needed by context
            }

            // If the value itself is a formula, we can't easily inline it without a full dependency graph resolver.
            // Users usually set Width=100, then Y=Self.Width/2.
            return val.toString();
        }
        return '0'; // Fallback
    });

    // 3. Tokenize to handle units (px vs scalars)
    // CSS calc() requires units for + and - (e.g., "100% - 20px"), but * and / need numbers (e.g. "100% / 2").
    // We need to guess where to add 'px'.

    // Naive approach:
    // Split by operators, trim. 
    // If a token is a bare number, decides if it needs 'px'.
    // Heuristic:
    // - If we are subtracting or adding to a %, the number needs 'px'.
    // - If we are multiplying or dividing, the number stays a scalar.

    // Actually, "Parent.Height / 2" -> "100% / 2". 2 is scalar. Correct.
    // "Parent.Height - 50" -> "100% - 50". 50 needs to be 50px.

    // Let's rely on a simpler regex replacement for now:
    // " Any bare number that is NOT preceded by * or / " should probably be px?
    // Not 100% robust but handles the "Height / 2 - Height / 2" case.
    // "100% / 2 - 50 / 2"
    // The "2"s are divisors. "50" might be a length.

    // Better Approach:
    // If the expression results in a calc, return `calc(...)`.
    // Use a regex to identify numbers.

    // Let's preserve the operators and just fix the numbers.
    // We can iterate through tokens.

    const tokens = cssExpression.split(/([+\-*/()])/); // Split but keep delimiters

    const processedTokens = tokens.map((t, index) => {
        const token = t.trim();
        if (!token) return '';

        // Return operators as is
        if (/^[+\-*/()]$/.test(token)) return ` ${token} `; // Add spacing for safety

        // If it's a number
        if (/^-?\d+(\.\d+)?$/.test(token)) {
            // Look ahead/behind to decide if it's a scalar or length.
            // This is hard to do perfectly without a parser tree.
            // BUT, for the user request: "Parent.Height / 2 - Self.Height / 2"
            // Becomes: "100% / 2 - 50 / 2"
            // CSS valid: calc(100% / 2 - 25px). 
            // WAIT, "50 / 2" is "25". 
            // If we just output "calc(100% / 2 - 50 / 2)" -> Invalid CSS? 
            // Chrome: calc(100px / 2) works. calc(100% / 2 - 25) invalid. calc(100% / 2 - 25px) valid.

            // So operands of + and - MUST be lengths. Operands of * and / CAN be scalars.

            // Let's assume all "Self.Height" or raw numbers returned from context are pixels (Lengths) initially.
            // If we have "50", we change it to "50px".
            // IF it is being used as a divisor, "50px" is invalid? calc(100% / 50px) ?? 
            // No, usually you divide by a scalar.

            // Allow heuristic:
            // If previous significant token was "/" or "*", treat as scalar.
            // Else treat as pixel.

            let prevOp = '';
            for (let i = index - 1; i >= 0; i--) {
                const p = tokens[i].trim();
                if (p) {
                    if (/^[+\-*/]$/.test(p)) prevOp = p;
                    break;
                }
            }

            if (prevOp === '*' || prevOp === '/') {
                return token; // Scalar
            } else {
                return `${token}px`; // Length
            }
        }

        return token;
    });

    const finalCalc = processedTokens.join('').trim();

    // Optimization: If it's just a single dimension (e.g. "300px"), don't wrap in calc
    if (processedTokens.length === 1 && /^[0-9]+(px|%)$/.test(finalCalc)) {
        return finalCalc;
    }

    // Fix invalid "calc (" produced by the join
    return `calc(${finalCalc})`.replace(/calc\s+\(/g, 'calc(');
};

/**
 * Normalizes the new Source Code format (Screens -> Children List) into the internal component tree.
 */
const normalizeControlSource = (node: any, name: string): any => {
    const result: any = { ...node.Properties };
    result.ControlName = name; // Store the control name
    if (node.Variant) {
        result.Variant = node.Variant;
    }

    // Handle Control Type
    // Format: "Label@2.5.1" -> "label"
    // Format: "Classic/Button@2.2.0" -> "button"
    if (node.Control) {
        const typeParts = node.Control.split('@');
        let typeName = typeParts[0];
        if (typeName.startsWith('Classic/')) {
            typeName = typeName.replace('Classic/', '');
        }
        result.As = typeName.toLowerCase();
    } else if (name) {
        // Fallback or specific handling for Screens which might not have 'Control' property in root list sometimes?
        // Actually Screens list usually looks like: MyScreen: { Properties:..., Children:... }
        // We treat it as a screen.
        result.As = 'screen';
    }

    // Process Properties values
    Object.keys(result).forEach(key => {
        // Pass the current result object as context so Self references can be resolved against other properties
        // Pass key to avoid evaluating event handlers
        result[key] = processValue(result[key], result, key);
        // Simple color conversion if needed, though usually handled in renderer
    });

    // Handle Children
    if (node.Children && Array.isArray(node.Children)) {
        result._Children = node.Children.map((childObj: any) => {
            // ChildObj is like: { Footer_2: { Control:..., ... } }
            // We need to extract the key and value
            const childName = Object.keys(childObj)[0];
            const childNode = childObj[childName];
            return normalizeControlSource(childNode, childName);
        });
    }

    // Handle AutoLayout Logic
    // DISABLED: We want to handle this at runtime via CSS Flexbox in the renderer (ControlMapper/BasicRenderers).
    // The parser should NOT overwrite Width/Height/X/Y with static calculations because it prevents
    // dynamic updates (e.g. if Height triggers a variable change, the static calc() won't update).
    /*
    if (result.Variant === 'AutoLayout' && result._Children && result._Children.length > 0) {
        const count = result._Children.length;
        const gap = typeof result.LayoutGap === 'number' ? result.LayoutGap : 0;
        const direction = result.LayoutDirection || 'Vertical';
        const alignItems = result.LayoutAlignItems || 'Stretch';

        const padL = typeof result.PaddingLeft === 'number' ? result.PaddingLeft : 0;
        const padR = typeof result.PaddingRight === 'number' ? result.PaddingRight : 0;
        const padT = typeof result.PaddingTop === 'number' ? result.PaddingTop : 0;
        const padB = typeof result.PaddingBottom === 'number' ? result.PaddingBottom : 0;

        // Generate Formula Strings
        const totalGap = (count - 1) * gap;

        if (direction === 'Horizontal') {
            const widthFormula = `(Parent.Width - ${padL + padR + totalGap}) / ${count}`;
            const widthCss = parseFormulaToCSS(widthFormula, result);

            result._Children.forEach((child: any, index: number) => {
                child.Width = widthCss;

                // Position X
                const xFormula = `${padL} + (${widthFormula} + ${gap}) * ${index}`;
                child.X = parseFormulaToCSS(xFormula, result);

                // Position Y (Cross Axis)
                if (alignItems === 'Center') {
                    // If child.Height is undefined, we can't center it properly and it might collapse. 
                    // Default to Stretch/Parent.Height if undefined to ensure visibility.
                    if (!child.Height) {
                        child.Height = parseFormulaToCSS(`Parent.Height - ${padT + padB}`, result);
                    }
                    // child context needed for Self.Height
                    child.Y = parseFormulaToCSS(`(Parent.Height - Self.Height) / 2`, { ...result, ...child });
                } else if (alignItems === 'Stretch') {
                    child.Y = parseFormulaToCSS(`${padT}`, result);
                    child.Height = parseFormulaToCSS(`Parent.Height - ${padT + padB}`, result);
                } else {
                    // Start/Top
                    child.Y = parseFormulaToCSS(`${padT}`, result);
                }
            });

        } else {
            // Vertical
            const heightFormula = `(Parent.Height - ${padT + padB + totalGap}) / ${count}`;
            const heightCss = parseFormulaToCSS(heightFormula, result);

            result._Children.forEach((child: any, index: number) => {
                child.Height = heightCss;

                // Position Y
                const yFormula = `${padT} + (${heightFormula} + ${gap}) * ${index}`;
                child.Y = parseFormulaToCSS(yFormula, result);

                // Position X (Cross Axis)
                if (alignItems === 'Center') {
                    // child context needed for Self.Width
                    child.X = parseFormulaToCSS(`(Parent.Width - Self.Width) / 2`, { ...result, ...child });
                } else if (alignItems === 'Stretch') {
                    child.X = parseFormulaToCSS(`${padL}`, result);
                    child.Width = parseFormulaToCSS(`Parent.Width - ${padL + padR}`, result);
                } else {
                    child.X = parseFormulaToCSS(`${padL}`, result);
                }
            });
        }
    }
    */

    return result;
};

/**
 * Main parser function to convert YAML to a clean JSON structure.
 */
export const parsePowerYAML = (yamlStr: string): any => {
    try {
        const rawJson = yaml.load(yamlStr) as any;

        if (!rawJson) return null;

        // Detection: New Format vs Legacy Format
        if (rawJson.Screens) {
            // New Format
            const result: any = {};
            Object.keys(rawJson.Screens).forEach(screenName => {
                const screenNode = rawJson.Screens[screenName];
                result[screenName] = normalizeControlSource(screenNode, screenName);
            });
            return result;
        } else {
            // Legacy Format
            return stripMetadata(rawJson);
        }
    } catch (e) {
        console.error('Error parsing YAML:', e);
        return null;
    }
};
