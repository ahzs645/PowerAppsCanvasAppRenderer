import React from 'react';

interface PositionWrapperProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    children: React.ReactNode;
}

const PositionWrapper: React.FC<PositionWrapperProps> = ({
    x = 0,
    y = 0,
    width = 'auto',
    height = 'auto',
    children
}) => {
    // Simple conversion: if it's a number, add px. If it's a string (like a formula), we'll deal with it later.
    const style: React.CSSProperties = {
        position: 'absolute',
        left: typeof x === 'number' ? `${x}px` : x,
        top: typeof y === 'number' ? `${y}px` : y,
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        boxSizing: 'border-box',
    };

    return <div style={style}>{children}</div>;
};

export default PositionWrapper;
