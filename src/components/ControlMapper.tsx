import React from 'react';
import PositionWrapper from './PositionWrapper';
import {
    LabelRenderer,
    ButtonRenderer,
    TextInputRenderer,
    RectangleRenderer
} from './renderers/BasicRenderers';

interface ControlMapperProps {
    control: any;
}

const ControlMapper: React.FC<ControlMapperProps> = ({ control }) => {
    if (!control || !control.As) return null;

    const type = control.As.toLowerCase();

    // Extract common positioning props
    const positionProps = {
        x: control.X,
        y: control.Y,
        width: control.Width,
        height: control.Height,
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
        case 'rectangle':
        case 'groupcontainer':
            Renderer = <RectangleRenderer props={control} />;
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
