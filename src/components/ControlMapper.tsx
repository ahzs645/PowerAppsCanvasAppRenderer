import React from 'react';
import PositionWrapper from './PositionWrapper';
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
}

const ControlMapper: React.FC<ControlMapperProps> = ({ control }) => {
    if (!control || !control.As) return null;

    const type = control.As.toLowerCase();

    // Extract common positioning props
    const positionProps = {
        x: type === 'screen' ? 0 : control.X,
        y: type === 'screen' ? 0 : control.Y,
        width: type === 'screen' ? '100%' : control.Width,
        height: type === 'screen' ? '100%' : control.Height,
        name: control.ControlName // Pass control name
    };

    let Renderer = null;

    switch (type) {
        case 'label':
            Renderer = <LabelRenderer props={control} />;
            break;
        case 'button':
            Renderer = <ButtonRenderer props={control} />;
            break;
        case 'textinput':
            Renderer = <TextInputRenderer props={control} />;
            break;
        case 'icon':
            Renderer = <IconRenderer props={control} />;
            break;
        case 'image':
            Renderer = <ImageRenderer props={control} />;
            break;
        case 'gallery':
            Renderer = <GalleryRenderer props={control} />;
            break;
        case 'datepicker':
            Renderer = <DatePickerRenderer props={control} />;
            break;
        case 'rectangle':
            Renderer = <RectangleRenderer props={control} />;
            break;
        case 'groupcontainer':
            Renderer = <GroupContainerRenderer props={control} />;
            break;
        case 'dropdown':
            Renderer = <DropdownRenderer props={control} />;
            break;
        case 'combobox':
            Renderer = <ComboboxRenderer props={control} />;
            break;
        case 'form':
            Renderer = <FormRenderer props={control} />;
            break;
        case 'typeddatacard':
            Renderer = <TypedDataCardRenderer props={control} />;
            break;
        case 'screen':
            Renderer = <ScreenRenderer props={control} />;
            break;
        case 'circle':
            Renderer = <CircleRenderer props={control} />;
            break;
        default:
            Renderer = (
                <div style={{ border: '1px dashed #ccc', width: '100%', height: '100%', fontSize: '10px' }}>
                    Unknown: {type}
                </div>
            );
    }

    return (
        <PositionWrapper {...positionProps}>
            {Renderer}
            {/* Recursively render children if any */}
            {control._Children?.map((child: any, index: number) => (
                <ControlMapper key={index} control={child} />
            ))}
        </PositionWrapper>
    );
};

export default ControlMapper;
