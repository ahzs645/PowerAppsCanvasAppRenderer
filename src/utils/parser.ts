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
    const result = parts.length > 1
        ? parts.map(p => evaluatePowerFx(p.trim())).join('')
        : (() => {
            let expr = expression.trim();

            // String Literal
            if (expr.startsWith('"') && expr.endsWith('"')) {
                return expr.substring(1, expr.length - 1);
            }

            // Interpolated String: $"..."
            if (expr.startsWith('$"') && expr.endsWith('"')) {
                let content = expr.substring(2, expr.length - 1);
                return content;
            }

            // Property Access: Object.Property
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
                        const text = String(args[0] || "");
                        const sep = String(args[1] || "");
                        return text.split(sep).map(s => ({ Result: s, Value: s }));
                    case 'first':
                        const list = args[0];
                        if (Array.isArray(list) && list.length > 0) {
                            return list[0];
                        }
                        return { Result: "", Value: "" };
                    case 'encodeurl':
                        return encodeURIComponent(String(args[0] || ""));
                    default:
                        return expr;
                }
            }

            return expr;
        })();

    return result;
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
 * Builds a flat map of all controls and their properties for reference resolution.
 */
const buildControlMap = (rawJson: any): Record<string, any> => {
    const map: Record<string, any> = {};

    const traverse = (node: any, name: string) => {
        if (!node) return;
        const props = { ...node.Properties };
        props.ControlName = name;
        map[name] = props;

        if (node.Children && Array.isArray(node.Children)) {
            node.Children.forEach((childObj: any) => {
                const childName = Object.keys(childObj)[0];
                traverse(childObj[childName], childName);
            });
        }
    };

    if (rawJson.Screens) {
        Object.keys(rawJson.Screens).forEach(screenName => {
            traverse(rawJson.Screens[screenName], screenName);
        });
    }

    return map;
};

/**
 * Processes formula values.
 */
/**
 * Processes formula values, resolving references from the controlMap if found.
 */
const processValue = (value: any, context: any = {}, key?: string, controlMap?: Record<string, any>): any => {
    if (typeof value !== 'string') return value;

    let cleanValue = value.trim();
    if (cleanValue.startsWith('=')) {
        cleanValue = cleanValue.substring(1).trim();
    }

    // SKIP for Action properties
    if (key && key.startsWith('On')) {
        return value;
    }

    // 1. Handle Simple Strings (Quotes)
    if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
        return cleanValue.substring(1, cleanValue.length - 1);
    }

    // 3. Handle Colors & Special Literals early
    const upperValue = cleanValue.toUpperCase();
    if (upperValue.startsWith('RGBA(')) return cleanValue.toLowerCase();
    if (cleanValue.startsWith('Color.')) return cleanValue.split('.')[1].toLowerCase();
    if (cleanValue.includes('LayoutDirection.')) return cleanValue.split('.')[1];
    if (cleanValue.includes('LayoutAlignItems.')) return cleanValue.split('.')[1];

    // 4. PowerFx Data/String Formulas (High Priority)
    // If it contains &, function calls, or starts with ", it's likely a PowerFx expression
    const hasLogic = cleanValue.includes('&&') || cleanValue.includes('||');
    const isPowerFx = !hasLogic && (
        cleanValue.includes('User(') ||
        cleanValue.includes('First(') ||
        cleanValue.includes('Split(') ||
        cleanValue.includes('EncodeUrl(') ||
        cleanValue.includes('&') ||
        cleanValue.startsWith('$')
    );

    if (isPowerFx) {
        return evaluatePowerFx(cleanValue);
    }

    // 5. Formula Parsing for Layout Properties (Math/References)
    // ONLY for specific layout properties and ONLY if not a simple string
    const layoutKeys = ['X', 'Y', 'Width', 'Height', 'PaddingTop', 'PaddingBottom', 'PaddingLeft', 'PaddingRight', 'RadiusTopLeft', 'RadiusTopRight', 'RadiusBottomLeft', 'RadiusBottomRight', 'BorderThickness', 'TemplateSize'];
    const isLayoutProp = key && layoutKeys.includes(key);

    if (isLayoutProp && !cleanValue.startsWith('"')) {
        const isMath = /[+\-*/]/.test(cleanValue) || cleanValue.includes('Parent.') || cleanValue.includes('Self.');
        const isReference = controlMap && Object.keys(controlMap).some(n => cleanValue.includes(n + '.'));

        if (isMath || isReference) {
            if (cleanValue.trim().startsWith('-')) {
                cleanValue = '0px ' + cleanValue;
            }
            return parseFormulaToCSS(cleanValue, context, controlMap);
        }
    }

    return cleanValue;
};

/**
 * Converts a Power Apps math formula into a CSS calc() string.
 */
const parseFormulaToCSS = (formula: string, context: any, controlMap?: Record<string, any>): string | number => {
    let cssExpression = formula
        .replace(/Parent\.Width/gi, '100%')
        .replace(/Parent\.Height/gi, '100%');

    // Replace Self References
    cssExpression = cssExpression.replace(/Self\.([a-zA-Z0-9_]+)/gi, (_, propName) => {
        if (context && context[propName] !== undefined) {
            const val = context[propName];
            if (typeof val === 'number' || /^\d+$/.test(val)) return val.toString();
            return val.toString();
        }
        return '0';
    });

    // Replace External References (e.g. Rectangle1.Height)
    if (controlMap) {
        Object.keys(controlMap).forEach(controlName => {
            const regex = new RegExp(`${controlName}\\.([a-zA-Z0-9_]+)`, 'gi');
            cssExpression = cssExpression.replace(regex, (_, propName) => {
                const props = controlMap[controlName];
                if (props && props[propName] !== undefined) {
                    let val = props[propName];
                    if (typeof val === 'string' && val.startsWith('=')) {
                        val = val.substring(1).trim();
                        if (/^\d+$/.test(val)) return val;
                    }
                    if (typeof val === 'number' || /^\d+$/.test(val)) return val.toString();
                    return val.toString();
                }
                return '0';
            });
        });
    }

    const tokens = cssExpression.split(/([+\-*/()])/);

    const processedTokens = tokens.map((t, index) => {
        const token = t.trim();
        if (!token) return '';
        if (/^[+\-*/()]$/.test(token)) return ` ${token} `;

        if (/^-?\d+(\.\d+)?$/.test(token)) {
            let prevOp = '';
            for (let i = index - 1; i >= 0; i--) {
                const p = tokens[i].trim();
                if (p) {
                    if (/^[+\-*/]$/.test(p)) prevOp = p;
                    break;
                }
            }
            if (prevOp === '*' || prevOp === '/') return token;
            else return `${token}px`;
        }

        return token;
    });

    const finalCalc = processedTokens.join('').trim();
    if (processedTokens.length === 1 && /^[0-9]+(px|%)$/.test(finalCalc)) {
        return finalCalc;
    }
    return `calc(${finalCalc})`.replace(/calc\s+\(/g, 'calc(');
};

/**
 * Normalizes the new Source Code format into the internal component tree.
 */
const normalizeControlSource = (node: any, name: string, controlMap?: Record<string, any>): any => {
    const result: any = { ...node.Properties };
    result.ControlName = name;
    if (node.Variant) {
        result.Variant = node.Variant;
    }

    if (node.Control) {
        const typeParts = node.Control.split('@');
        let typeName = typeParts[0];
        if (typeName.startsWith('Classic/')) {
            typeName = typeName.replace('Classic/', '');
        }
        result.As = typeName.toLowerCase();
    } else if (name) {
        result.As = 'screen';
    }

    // Process Properties values
    Object.keys(result).forEach(key => {
        result[key] = processValue(result[key], result, key, controlMap);
    });

    // Handle Children
    if (node.Children && Array.isArray(node.Children)) {
        result._Children = node.Children.map((childObj: any) => {
            const childName = Object.keys(childObj)[0];
            const childNode = childObj[childName];
            return normalizeControlSource(childNode, childName, controlMap);
        });
    }

    return result;
};

/**
 * Main parser function to convert YAML to a clean JSON structure.
 */
export const parsePowerYAML = (yamlStr: string): any => {
    try {
        const rawJson = yaml.load(yamlStr) as any;
        if (!rawJson) return null;

        if (rawJson.Screens) {
            const controlMap = buildControlMap(rawJson);
            const result: any = {};
            Object.keys(rawJson.Screens).forEach(screenName => {
                const screenNode = rawJson.Screens[screenName];
                result[screenName] = normalizeControlSource(screenNode, screenName, controlMap);
            });
            return result;
        } else {
            return stripMetadata(rawJson);
        }
    } catch (e) {
        console.error('Error parsing YAML:', e);
        return null;
    }
};
