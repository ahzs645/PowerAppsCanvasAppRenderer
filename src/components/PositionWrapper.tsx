import React from 'react';

interface PositionWrapperProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
    fillPortions?: number;
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
    minWidth,
    minHeight,
    fillPortions = 0,
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
        minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth,
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
        flex: isParentAutoLayout ? (fillPortions > 0 ? `${fillPortions} 1 0%` : (width === 'auto' && height === 'auto' ? 1 : 'none')) : undefined,
        alignSelf: isParentAutoLayout ? 'stretch' : undefined,
        boxSizing: 'border-box',
        overflow: 'hidden',
        // Actually for highlighting we might want z-index.
        zIndex: isHighlighted ? 1000 : undefined,
        outline: isHighlighted ? '1px solid red' : 'none',
        boxShadow: isHighlighted ? '0 0 10px rgba(255, 0, 0, 0.3)' : 'none',
    };

    if (name === 'ContainerHeader') {
        console.log(`[DEBUG] PositionWrapper ${name}: fillPortions=${fillPortions}, width=${width}, height=${height}, flex=${style.flex}`);
    }

    return <div style={style} data-control-name={name}>{children}</div>;
};

export default PositionWrapper;
