import React from 'react';
import { useInspect } from '../context/InspectContext';

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
    isSelected?: boolean;
    onSelect?: (name: string) => void;
    onContextMenu?: (e: React.MouseEvent, name: string) => void;
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
    isSelected,
    onSelect,
    onContextMenu,
    isParentAutoLayout,
    children
}) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const inspect = useInspect();

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
    };

    // Editor-focus chrome (hover dashed outline, selection highlight). Only when inspect mode is on.
    if (inspect) {
        style.zIndex = isSelected ? 1001 : (isHighlighted || isHovered ? 1000 : undefined);
        style.outline = isSelected ? '2px solid #0078d4' : (isHighlighted ? '1px solid red' : (isHovered ? '1px dashed #0078d4' : 'none'));
        style.borderRadius = (isSelected || isHovered) ? '4px' : undefined;
        style.boxShadow = isSelected ? '0 0 15px rgba(0, 120, 212, 0.4)' : (isHighlighted ? '0 0 10px rgba(255, 0, 0, 0.3)' : (isHovered ? '0 0 5px rgba(0, 120, 212, 0.2)' : 'none'));
        style.cursor = 'pointer';
        style.transition = 'outline 0.1s ease-in-out, box-shadow 0.1s ease-in-out';
        style.backgroundColor = isHovered && !isSelected ? 'rgba(0, 120, 212, 0.05)' : undefined;
    }

    return (
        <div
            style={style}
            data-control-name={name}
            onMouseEnter={inspect ? () => setIsHovered(true) : undefined}
            onMouseLeave={inspect ? () => setIsHovered(false) : undefined}
            onContextMenu={inspect ? (e) => {
                if (onContextMenu && name) {
                    e.stopPropagation();
                    onContextMenu(e, name);
                }
            } : undefined}
            onClick={inspect ? (e) => {
                if (onSelect && name) {
                    e.stopPropagation();
                    onSelect(name);
                }
            } : undefined}
        >
            {children}
        </div>
    );
};

export default PositionWrapper;
