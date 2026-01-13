
export interface ValidationError {
    type: 'unknown_control' | 'unknown_property';
    message: string;
    path: string;
    severity: 'warning' | 'error';
}

// Whitelist of supported controls and their known properties
const KNOWN_CONTROLS: Record<string, string[]> = {
    'screen': ['Fill', 'ImagePosition', 'BackgroundImage', 'LoadingSpinnerColor', 'OnVisible'],
    'label': ['Text', 'X', 'Y', 'Width', 'Height', 'Size', 'Color', 'Align', 'Font', 'FontWeight', 'Visible', 'BorderColor', 'BorderThickness', 'Fill', 'OnSelect', 'PaddingLeft', 'PaddingRight', 'PaddingTop', 'PaddingBottom', 'AutoHeight', 'Wrap', 'Live'],
    'button': ['Text', 'X', 'Y', 'Width', 'Height', 'Size', 'Color', 'Fill', 'BorderColor', 'Visible', 'OnSelect', 'HoverFill', 'PressedFill', 'DisabledBorderColor', 'DisabledColor', 'DisabledFill', 'FocusedBorderColor', 'HoverBorderColor', 'HoverColor', 'PressedBorderColor', 'PressedColor', 'BorderThickness', 'RadiusBottomLeft', 'RadiusBottomRight', 'RadiusTopLeft', 'RadiusTopRight', 'PaddingRight', 'PaddingLeft', 'PaddingTop', 'PaddingBottom', 'Align', 'Font'],
    'textinput': ['Default', 'HintText', 'X', 'Y', 'Width', 'Height', 'Size', 'Color', 'Fill', 'BorderColor', 'Visible', 'Mode', 'Format', 'BorderThickness', 'DisabledBorderColor', 'DisabledColor', 'DisabledFill', 'DisplayMode', 'Font', 'HoverBorderColor', 'HoverFill', 'DelayOutput', 'MaxLength', 'PaddingLeft', 'RadiusBottomLeft', 'RadiusBottomRight', 'RadiusTopLeft', 'RadiusTopRight', 'Tooltip'],
    'rectangle': ['X', 'Y', 'Width', 'Height', 'Fill', 'BorderColor', 'Visible'],
    'groupcontainer': ['X', 'Y', 'Width', 'Height', 'Visible', 'Fill', 'DropShadow', 'RadiusBottomLeft', 'RadiusBottomRight', 'RadiusTopLeft', 'RadiusTopRight', 'PaddingBottom', 'PaddingLeft', 'PaddingRight', 'PaddingTop', 'Variant', 'LayoutAlignItems', 'LayoutDirection', 'LayoutGap', 'LayoutJustifyContent', 'LayoutMinHeight', 'LayoutMinWidth', 'LayoutMaxHeight', 'LayoutMaxWidth', 'BorderColor', 'BorderThickness', 'LayoutOverflowY', 'FillPortions'],
    'icon': ['Icon', 'X', 'Y', 'Width', 'Height', 'Color', 'BorderColor', 'Visible', 'OnSelect', 'HoverFill', 'PressedFill', 'DisabledFill', 'Rotation'],
    'image': ['Image', 'X', 'Y', 'Width', 'Height', 'BorderColor', 'Visible', 'OnSelect', 'DisabledFill', 'HoverFill', 'PressedFill', 'DisabledBorderColor', 'Fill', 'PaddingTop', 'PaddingRight', 'PaddingBottom', 'PaddingLeft', 'RadiusTopLeft', 'RadiusTopRight', 'RadiusBottomLeft', 'RadiusBottomRight'],
    'gallery': ['Items', 'TemplateSize', 'X', 'Y', 'Width', 'Height', 'BorderColor', 'Visible', 'Variant'],
    'datepicker': ['DefaultDate', 'X', 'Y', 'Width', 'Height', 'BorderColor', 'Color', 'Fill', 'Visible', 'BorderThickness', 'DisabledBorderColor', 'DisabledColor', 'FocusedBorderColor', 'Font', 'FontWeight', 'IconBackground', 'IconFill', 'OnChange', 'FocusedBorderThickness'],
    'circle': ['Fill', 'BorderColor', 'X', 'Y', 'Width', 'Height', 'Visible'],
    'dropdown': ['Items', 'X', 'Y', 'Width', 'Height', 'Visible', 'Fill', 'BorderColor', 'BorderThickness', 'Color', 'Default', 'Select', 'OnSelect', 'ChevronBackground', 'ChevronFill', 'ChevronHoverBackground', 'ChevronHoverFill', 'Font', 'HoverFill', 'Items.Value', 'PressedColor', 'PressedFill', 'SelectionColor', 'SelectionFill', 'OnChange'],
    'combobox': ['Items', 'X', 'Y', 'Width', 'Height', 'Visible', 'Fill', 'BorderColor', 'BorderThickness', 'Color', 'Default', 'Select', 'OnSelect', 'ChevronBackground', 'ChevronFill', 'ChevronHoverBackground', 'ChevronHoverFill', 'Font', 'HoverFill', 'Items.Value', 'PressedColor', 'PressedFill', 'SelectionColor', 'SelectionFill', 'OnChange', 'IsSearchable', 'SelectMultiple', 'DefaultSelectedItems', 'DisplayMode', 'PaddingLeft', 'Tooltip'],
    'form': ['X', 'Y', 'Width', 'Height', 'Visible', 'Fill', 'BorderColor', 'BorderThickness', 'DataSource', 'Item', 'OnSuccess', 'OnFailure', 'OnReset', 'SnapToColumns'],
    'typeddatacard': ['X', 'Y', 'Width', 'Height', 'Visible', 'Fill', 'BorderColor', 'BorderThickness', 'DataField', 'DisplayName', 'Required', 'Update', 'Default', 'MaxLength']
};

// Common properties applicable to almost all controls
const COMMON_PROPS = ['X', 'Y', 'Width', 'Height', 'Visible', 'As', 'Control', 'Variant', 'ControlName', 'LayoutMinHeight', 'LayoutMinWidth', 'LayoutFillPortion'];

export const validateControl = (control: any, path: string = 'root'): ValidationError[] => {
    let errors: ValidationError[] = [];

    if (!control || typeof control !== 'object') return errors;

    // Check if 'As' type is known
    const controlType = control.As?.toLowerCase();

    if (!controlType) {
        // If no 'As', it might be the root container object (like a map of screens)
        // We will just try to recurse on children or keys if it looks like a container
        return errors;
    }

    if (!KNOWN_CONTROLS[controlType]) {
        errors.push({
            type: 'unknown_control',
            message: `Unknown control type: '${control.As}'`,
            path: path,
            severity: 'warning'
        });
    } else {
        // Validate properties
        const allowedProps = new Set([...KNOWN_CONTROLS[controlType], ...COMMON_PROPS]);

        Object.keys(control).forEach(prop => {
            // Skip internal keys or children or metadata
            if (prop.startsWith('_') || prop === 'As' || prop === 'Children') return;

            // Allow strict equality check
            if (!allowedProps.has(prop)) {
                errors.push({
                    type: 'unknown_property',
                    message: `Unknown property '${prop}' on control of type '${controlType}'`,
                    path: `${path}.${prop}`,
                    severity: 'warning'
                });
            }
        });
    }

    // Recurse on children (Normalized structure uses _Children)
    if (control._Children && Array.isArray(control._Children)) {
        control._Children.forEach((child: any, index: number) => {
            // Try to find a name for the path if possible, otherwise use index
            // The normalized parser passes name down if we stored it, but currently we imply it.
            // Let's assume child is mostly nameless in _Children unless we add a 'Name' prop.
            const childPath = `${path}.child[${index}]`;
            errors = [...errors, ...validateControl(child, childPath)];
        });
    }

    return errors;
};

export const validatePowerAppStart = (data: any, path: string = ''): ValidationError[] => {
    let errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') return errors;

    // Iterate over root keys (Screens)
    Object.keys(data).forEach(key => {
        const value = data[key];
        const currentPath = path ? `${path}.${key}` : key;

        // If it looks like a control, validate it
        if (value && typeof value === 'object' && value.As) {
            errors = [...errors, ...validateControl(value, currentPath)];
        }
    });

    return errors;
};
