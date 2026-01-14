import React from 'react';

interface PositionWrapperProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    name?: string;
    isHighlighted?: boolean;
    isParentAutoLayout?: boolean;
    children: React.ReactNode;
}

const PositionWrapper: React.FC<PositionWrapperProps> = ({
    x = 0,
    y = 0,
    width = 'auto',
    height = 'auto',
    name,
    isHighlighted,
    isParentAutoLayout,
    children
}) => {
    // Simple conversion: if it's a number, add px. If it's a string (like a formula), we'll deal with it later.
    const style: React.CSSProperties = {
        position: isParentAutoLayout ? 'relative' : 'absolute',
        left: isParentAutoLayout ? undefined : (typeof x === 'number' ? `${x}px` : x),
        top: isParentAutoLayout ? undefined : (typeof y === 'number' ? `${y}px` : y),
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        boxSizing: 'border-box',
        overflow: 'visible', // Visible to show outline if needed? But clip content is good. Outline is outside usually.
        // Actually for highlighting we might want z-index.
        zIndex: isHighlighted ? 1000 : undefined,
        outline: isHighlighted ? '1px solid red' : 'none',
        boxShadow: isHighlighted ? '0 0 10px rgba(255, 0, 0, 0.3)' : 'none',
        // If it is in a flex container, we might want to respect flex properties if provided?
        // But for now, just following width/height and flow is enough.
    };

    return <div style={style} data-control-name={name}>{children}</div>;
};

export default PositionWrapper;
