import React from 'react';
import PositionWrapper from './PositionWrapper';
import { usePowerFx } from '../context/PowerFxContext';
import {
    LabelRenderer,
    ButtonRenderer,
    TextInputRenderer,
    RectangleRenderer,
    IconRenderer,
    ImageRenderer,
    GalleryRenderer,
    DatePickerRenderer,
    CircleRenderer,
    GroupContainerRenderer,
    DropdownRenderer,
    FormRenderer,
    TypedDataCardRenderer,
    ComboboxRenderer,
    ScreenRenderer
} from './renderers/BasicRenderers';

interface ControlMapperProps {
    control: any;
    highlightedControls?: Set<string>;
    isParentAutoLayout?: boolean;
}

const ControlMapper: React.FC<ControlMapperProps> = ({ control, highlightedControls, isParentAutoLayout }) => {
    const { evaluate, execute } = usePowerFx();
    if (control?.ControlName === 'ContainerDIs') {
        console.log('ControlMapper ContainerDIs:', control.Variant);
    }

    if (!control || !control.As) return null;

    // Handle Visible property
    // If it exists and evaluates to false, don't render.
    if (control.Visible !== undefined) {
        const isVisible = evaluate(String(control.Visible));
        // Strict check mostly, but handle truthy/falsy
        if (isVisible === false) return null;
    }

    // Handle OnVisible (mostly for Screens)
    React.useEffect(() => {
        if (control.OnVisible) {
            // "Set(...)"
            execute(control.OnVisible);
        }
    }, []); // Run once on mount (when visibility becomes true or component mounts)

    const type = control.As.toLowerCase();

    // Evaluate all properties to handle dynamic constraints (Variables, Formulas)
    const evaluatedControl: any = { ...control };

    Object.keys(control).forEach(key => {
        // Skip internal/structural keys that shouldn't be evaluated as PowerFx formulas
        if (key === 'As' || key === 'ControlName' || key === '_Children' || key === 'Control' || key === 'Properties' || key === 'Variant') {
            return;
        }

        // Skip event handlers (Actions) - they are executed, not evaluated as values
        // Also skip 'Visible' if it's handled specially, but usually we WANT to evaluate Visible.
        // In the original code, Visible was evaluated manually above. We can rely on this loop now, 
        // OR keep the manual check. The manual check returns null early. 
        // Let's keep the manual check for Visible logic flow, but evaluate it here too for prop passing.
        if (key.startsWith('On')) {
            return;
        }

        const rawValue = control[key];

        // If it's a string, it might be a formula or a variable reference
        if (typeof rawValue === 'string') {
            // evaluate() handles strings that don't start with '=' as well (literals/lookups)
            // But we must be careful not to break CSS strings or Enums that Parser already processed.
            // Fortunately, evaluateExpression safely falls back to returning the string if it doesn't match a pattern.
            try {
                evaluatedControl[key] = evaluate(rawValue);
            } catch (e) {
                console.warn(`Failed to evaluate property ${key} for ${control.ControlName}:`, e);
                // Keep original value on error
            }
        }
    });

    // Check highlight status
    // We check if THIS control is in the highlighted set
    const isHighlighted = highlightedControls?.has(control.ControlName);

    // Extract common positioning props using EVALUATED values
    const positionProps = {
        x: type === 'screen' ? 0 : evaluatedControl.X,
        y: type === 'screen' ? 0 : evaluatedControl.Y,
        width: type === 'screen' ? '100%' : evaluatedControl.Width,
        height: type === 'screen' ? '100%' : evaluatedControl.Height,
        name: control.ControlName, // Pass control name
        isHighlighted: isHighlighted // Pass highlight status
    };

    // Prepare extended props with execute context and evaluated values
    const extendedProps = {
        ...evaluatedControl,
        _onAction: execute // internal prop to pass execute down
    };

    let Renderer = null;

    const isContainerAutoLayout = control.Variant === 'AutoLayout';

    const childrenNodes = control._Children?.map((child: any, index: number) => {
        if (control.ControlName === 'ContainerDIs') {
            console.log('ContainerDIs child:', child.ControlName, 'passing matches:', isContainerAutoLayout);
        }
        return (
            <ControlMapper
                key={index}
                control={child}
                highlightedControls={highlightedControls}
                isParentAutoLayout={isContainerAutoLayout}
            />
        );
    });

    switch (type) {
        case 'label':
            Renderer = <LabelRenderer props={extendedProps} />;
            break;
        case 'button':
            Renderer = <ButtonRenderer props={extendedProps} />;
            break;
        case 'textinput':
            Renderer = <TextInputRenderer props={extendedProps} />;
            break;
        case 'icon':
            Renderer = <IconRenderer props={extendedProps} />;
            break;
        case 'image':
            Renderer = <ImageRenderer props={extendedProps} />;
            break;
        case 'gallery':
            Renderer = <GalleryRenderer props={extendedProps}>{childrenNodes}</GalleryRenderer>;
            break;
        case 'datepicker':
            Renderer = <DatePickerRenderer props={extendedProps} />;
            break;
        case 'rectangle':
            Renderer = <RectangleRenderer props={extendedProps} />;
            break;
        case 'groupcontainer':
            Renderer = <GroupContainerRenderer props={extendedProps}>{childrenNodes}</GroupContainerRenderer>;
            break;
        case 'dropdown':
            Renderer = <DropdownRenderer props={extendedProps} />;
            break;
        case 'combobox':
            Renderer = <ComboboxRenderer props={extendedProps} />;
            break;
        case 'form':
            Renderer = <FormRenderer props={extendedProps}>{childrenNodes}</FormRenderer>;
            break;
        case 'typeddatacard':
            Renderer = <TypedDataCardRenderer props={extendedProps}>{childrenNodes}</TypedDataCardRenderer>;
            break;
        case 'screen':
            Renderer = <ScreenRenderer props={extendedProps}>{childrenNodes}</ScreenRenderer>;
            break;
        case 'circle':
            Renderer = <CircleRenderer props={extendedProps} />;
            break;
        default:
            Renderer = (
                <div style={{ border: '1px dashed #ccc', width: '100%', height: '100%', fontSize: '10px' }}>
                    Unknown: {type}
                    {childrenNodes}
                </div>
            );
    }

    return (
        <PositionWrapper {...positionProps} isParentAutoLayout={isParentAutoLayout}>
            {Renderer}
        </PositionWrapper>
    );
};

export default ControlMapper;
