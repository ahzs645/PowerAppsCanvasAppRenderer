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
    parentProps?: any;
    appId?: string | null;
    appImages?: any[];
    onImageUploaded?: (img: any) => void;
}

const ControlMapper: React.FC<ControlMapperProps> = ({
    control,
    highlightedControls,
    isParentAutoLayout,
    parentProps,
    appId,
    appImages,
    onImageUploaded
}) => {
    const { evaluate, execute, registerControl } = usePowerFx();

    if (!control || !control.As) return null;

    // Handle Visible property
    if (control.Visible !== undefined) {
        const isVisible = evaluate(String(control.Visible), control, parentProps);
        if (isVisible === false) return null;
    }

    // Evaluate all properties to handle dynamic constraints (Variables, Formulas)
    const evaluatedControl = React.useMemo(() => {
        const result: any = { ...control };
        Object.keys(control).forEach(key => {
            if (key === 'As' || key === 'ControlName' || key === '_Children' || key === 'Control' || key === 'Properties' || key === 'Variant') {
                return;
            }
            if (key.startsWith('On')) return;

            const rawValue = control[key];
            if (typeof rawValue === 'string') {
                try {
                    result[key] = evaluate(rawValue, control, parentProps);
                } catch (e) {
                    console.warn(`Failed to evaluate property ${key} for ${control.ControlName}:`, e);
                }
            }
        });
        return result;
    }, [control, parentProps, evaluate]);

    // Register this control's evaluated properties so others can refer to it
    React.useEffect(() => {
        registerControl(control.ControlName, evaluatedControl);
    }, [control.ControlName, evaluatedControl, registerControl]);

    // Handle OnVisible
    React.useEffect(() => {
        if (control.OnVisible) {
            execute(control.OnVisible);
        }
    }, []);

    const type = control.As.toLowerCase();

    // Check highlight status
    const isHighlighted = highlightedControls?.has(control.ControlName);

    // Extract common positioning props using EVALUATED values
    const positionProps = {
        x: type === 'screen' ? 0 : evaluatedControl.X,
        y: type === 'screen' ? 0 : evaluatedControl.Y,
        width: type === 'screen' ? '100%' : evaluatedControl.Width,
        height: type === 'screen' ? '100%' : evaluatedControl.Height,
        minWidth: evaluatedControl.LayoutMinWidth,
        minHeight: evaluatedControl.LayoutMinHeight,
        fillPortions: evaluatedControl.LayoutGrow !== undefined ? Number(evaluatedControl.LayoutGrow) : evaluatedControl.FillPortions,
        name: control.ControlName,
        isHighlighted: isHighlighted
    };

    // Prepare extended props with execute context and evaluated values
    const extendedProps = {
        ...evaluatedControl,
        _onAction: execute
    };

    let Renderer = null;

    const isContainerAutoLayout = control.Variant === 'AutoLayout';

    const childrenNodes = control._Children?.map((child: any, index: number) => {
        return (
            <ControlMapper
                key={index}
                control={child}
                highlightedControls={highlightedControls}
                isParentAutoLayout={isContainerAutoLayout}
                parentProps={evaluatedControl}
                appId={appId}
                appImages={appImages}
                onImageUploaded={onImageUploaded}
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
            Renderer = <ImageRenderer
                props={extendedProps}
                appId={appId}
                appImages={appImages}
                onUploadSuccess={onImageUploaded}
            />;
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
        case 'text':
            Renderer = <LabelRenderer props={extendedProps} />;
            break;
        case 'canvascomponent':
            Renderer = (
                <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: extendedProps.Fill || 'transparent',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {childrenNodes}
                </div>
            );
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
