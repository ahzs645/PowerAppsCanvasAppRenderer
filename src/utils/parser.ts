import yaml from 'js-yaml';

export interface PowerAppControl {
    As: string;
    [key: string]: any;
    _Children?: PowerAppControl[];
}

/**
 * Strips metadata blocks like _Dependencies and _Properties from the parsed YAML.
 * Also recursively cleans up children.
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
 * Processes formula values. If a value starts with '=', it returns a placeholder.
 */
export const processFormulas = (value: any): any => {
    if (typeof value === 'string' && value.startsWith('=')) {
        return "[ƒx Formula]";
    }
    return value;
};

/**
 * Maps Power Apps RGBA/Hex to CSS colors.
 * Example: RGBA(0, 100, 200, 1) -> rgba(0, 100, 200, 1)
 */
export const convertColor = (colorStr: any): string => {
    if (typeof colorStr !== 'string') return colorStr;

    let color = colorStr.trim();

    // Handle RGBA(r, g, b, a)
    if (color.toUpperCase().startsWith('RGBA')) {
        return color.toLowerCase();
    }

    return color;
};

/**
 * Main parser function to convert YAML to a clean JSON structure.
 */
export const parsePowerYAML = (yamlStr: string): any => {
    try {
        const rawJson = yaml.load(yamlStr);
        const cleanJson = stripMetadata(rawJson);

        // We expect the root to be a Screen or a Control
        return cleanJson;
    } catch (e) {
        console.error('Error parsing YAML:', e);
        return null;
    }
};
