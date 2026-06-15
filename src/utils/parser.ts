import yaml from 'js-yaml';

export interface PowerAppControl {
    As: string;
    [key: string]: any;
    _Children?: PowerAppControl[];
}

/**
 * Strips metadata blocks like _Dependencies and _Properties from the parsed YAML.
 */
export const stripMetadata = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    const cleanData: any = {};
    for (const key in data) {
        if (key === '_Dependencies' || key === '_Properties') continue;
        if (Array.isArray(data[key])) cleanData[key] = data[key].map(stripMetadata);
        else if (typeof data[key] === 'object') cleanData[key] = stripMetadata(data[key]);
        else cleanData[key] = data[key];
    }
    return cleanData;
};

/**
 * Maps Power Apps control type names (classic AND modern) to the renderer's
 * internal renderer keys. Unknown types fall through to their lowercased name.
 */
const TYPE_ALIASES: Record<string, string> = {
    // text
    label: 'label', moderntext: 'label', text: 'label', textcanvas: 'label', htmltext: 'label',
    // inputs
    textinput: 'textinput', moderntextinput: 'textinput', textinputcanvas: 'textinput', textfield: 'textinput',
    // buttons
    button: 'button', modernbutton: 'button', buttoncanvas: 'button',
    // icons
    icon: 'icon', modernicon: 'icon', iconcanvas: 'icon', classicicon: 'icon',
    // dropdowns / combos
    dropdown: 'dropdown', moderndropdown: 'dropdown', dropdowncanvas: 'dropdown',
    combobox: 'combobox', moderncombobox: 'combobox', comboboxcanvas: 'combobox',
    // pickers
    datepicker: 'datepicker', moderndatepicker: 'datepicker', datepickercanvas: 'datepicker',
    // toggles / checks
    toggle: 'toggle', moderntoggle: 'toggle', togglecanvas: 'toggle', toggleswitch: 'toggle',
    checkbox: 'toggle', moderncheckbox: 'toggle',
    // containers
    groupcontainer: 'groupcontainer', container: 'groupcontainer',
    gallery: 'gallery', galleryexperimental: 'gallery',
    rectangle: 'rectangle', circle: 'circle', image: 'image', imagecanvas: 'image',
    form: 'form', editform: 'form', typeddatacard: 'typeddatacard',
    canvascomponent: 'canvascomponent', component: 'canvascomponent',
    screen: 'screen',
};

const mapType = (controlName: string): string => {
    let typeName = controlName.split('@')[0];
    if (typeName.startsWith('Classic/')) typeName = typeName.replace('Classic/', '');
    const lower = typeName.toLowerCase();
    return TYPE_ALIASES[lower] || lower;
};

/**
 * Normalizes the Power Apps source (.pa.yaml) format into the renderer's
 * internal component tree. Property values are kept as RAW formula strings
 * (e.g. "=RGBA(...)") and evaluated lazily at render time by the Power Fx
 * engine, so the full data/expression context is available.
 */
const normalizeControlSource = (node: any, name: string): any => {
    const result: any = { ...(node.Properties || {}) };
    result.ControlName = name;
    if (node.Variant) result.Variant = node.Variant;
    result.As = node.Control ? mapType(node.Control) : 'screen';
    if (node.Control) result._ControlType = node.Control;

    if (node.Children && Array.isArray(node.Children)) {
        result._Children = node.Children.map((childObj: any) => {
            const childName = Object.keys(childObj)[0];
            return normalizeControlSource(childObj[childName], childName);
        });
    }
    return result;
};

/**
 * Normalizes an already-parsed YAML object into the renderer's screen tree.
 */
export const parsePowerYAMLObject = (rawJson: any): any => {
    if (!rawJson) return null;
    if (rawJson.Screens) {
        const result: any = {};
        Object.keys(rawJson.Screens).forEach(screenName => {
            result[screenName] = normalizeControlSource(rawJson.Screens[screenName], screenName);
        });
        return result;
    }
    return stripMetadata(rawJson);
};

/**
 * Main parser: YAML string -> clean component tree (one entry per screen).
 */
export const parsePowerYAML = (yamlStr: string): any => {
    try {
        return parsePowerYAMLObject(yaml.load(yamlStr));
    } catch (e) {
        console.error('Error parsing YAML:', e);
        return null;
    }
};

const stripEq = (v: any): string | null => (typeof v === 'string' ? v.replace(/^=/, '').trim() : null);

export interface LoadedApp {
    screens: Record<string, any>;
    onStart: string | null;
    names: string[];
    startScreen: string | null;
    fileCount: number;
}

/**
 * Merges any number of *.pa.yaml file contents (an App file + screen files,
 * in either the `Screens:`-wrapped or bare-screen layout) into one app.
 */
export const loadAppFromFiles = (files: { name: string; text: string }[]): LoadedApp => {
    let onStart: string | null = null;
    let startScreen: string | null = null;
    const screensRaw: Record<string, any> = {};
    let used = 0;

    for (const f of files) {
        let doc: any;
        try { doc = yaml.load(f.text); } catch { continue; }
        if (!doc || typeof doc !== 'object') continue;
        used++;

        if (doc.App?.Properties) {
            if (onStart == null && doc.App.Properties.OnStart) onStart = doc.App.Properties.OnStart;
            if (startScreen == null) startScreen = stripEq(doc.App.Properties.StartScreen);
        }
        if (doc.Screens && typeof doc.Screens === 'object') {
            Object.assign(screensRaw, doc.Screens);
        } else {
            // Bare-screen file: top-level keys that look like controls.
            for (const k of Object.keys(doc)) {
                if (k === 'App' || k === 'ComponentDefinitions' || k.startsWith('_')) continue;
                const v = doc[k];
                if (v && typeof v === 'object' && (v.Children || v.Properties || v.Control)) screensRaw[k] = v;
            }
        }
    }

    const screens = parsePowerYAMLObject({ Screens: screensRaw }) || {};
    const names = Object.keys(screens);
    return { screens, onStart, names, startScreen: startScreen && names.includes(startScreen) ? startScreen : (names[0] || null), fileCount: used };
};

/**
 * Extracts the App.OnStart formula (if present) from a combined .pa.yaml doc.
 */
export const extractOnStart = (yamlStr: string): string | null => {
    try {
        const raw = yaml.load(yamlStr) as any;
        return raw?.App?.Properties?.OnStart ?? null;
    } catch {
        return null;
    }
};
