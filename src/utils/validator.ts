import { getControlSchema } from '../models/ControlRegistry';

export interface ValidationError {
    type: 'unknown_control' | 'unknown_property';
    message: string;
    path: string;
    severity: 'warning' | 'error';
}

// Internal metadata properties to skip during validation
const INTERNAL_PROPS = ['As', 'Children', '_Children', 'ControlName', 'Control', 'Properties', 'Variant'];

export const validateControl = (control: any, path: string = 'root'): ValidationError[] => {
    let errors: ValidationError[] = [];

    if (!control || typeof control !== 'object') return errors;

    // Check if 'As' type is known
    const controlType = control.As?.toLowerCase();

    if (!controlType) {
        return errors;
    }

    const schema = getControlSchema(controlType);

    if (!schema) {
        errors.push({
            type: 'unknown_control',
            message: `Unknown control type: '${control.As}'`,
            path: path,
            severity: 'warning'
        });
    } else {
        // Validate properties
        const allowedProps = new Set([...schema.getAllowedProperties(), ...INTERNAL_PROPS]);

        Object.keys(control).forEach(prop => {
            // Skip children
            if (prop === 'Children') return;

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
