import React from 'react';
import {
    Text,
} from '@fluentui/react-components';
import {
    Monitor,
    Type,
    MousePointer2,
    Type as TextInputIcon,
    Image as ImageIcon,
    Command,
    Square,
    Circle,
    LayoutList,
    Box,
    ClipboardList,
    ChevronDown,
    ChevronRight,
    GripVertical,
    Settings,
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ElementTreeProps {
    data: Record<string, any> | null;
    selectedControlName: string | null;
    onSelectControl: (name: string | null) => void;
    onInspectControl?: (name: string | null) => void;
    onContextMenu?: (e: React.MouseEvent, name: string) => void;
    onMoveControl?: (sourceName: string, targetName: string, position: 'before' | 'after' | 'inside') => void;
    level?: number;
}

const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case 'screen': return <Monitor size={14} />;
        case 'label': return <Type size={14} />;
        case 'button': return <MousePointer2 size={14} />;
        case 'textinput': return <TextInputIcon size={14} />;
        case 'image': return <ImageIcon size={14} />;
        case 'icon': return <Command size={14} />;
        case 'rectangle': return <Square size={14} />;
        case 'circle': return <Circle size={14} />;
        case 'gallery': return <LayoutList size={14} />;
        case 'groupcontainer': return <Box size={14} />;
        case 'form': return <ClipboardList size={14} />;
        case 'dropdown':
        case 'combobox': return <ChevronDown size={14} />;
        default: return <Box size={14} />;
    }
};

interface SortableTreeItemProps {
    id: string;
    data: any;
    level: number;
    isSelected: boolean;
    onSelectControl: (name: string | null) => void;
    onInspectControl?: (name: string | null) => void;
    onContextMenu?: (e: React.MouseEvent, name: string) => void;
    onMoveControl?: (sourceName: string, targetName: string, position: 'before' | 'after' | 'inside') => void;
    selectedControlName: string | null;
}

const SortableTreeItem: React.FC<SortableTreeItemProps> = (props) => {
    const [isExpanded, setIsExpanded] = React.useState(true);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div
                onClick={() => props.onSelectControl(props.data.ControlName)}
                onContextMenu={(e) => {
                    if (props.onContextMenu) {
                        e.stopPropagation();
                        props.onContextMenu(e, props.data.ControlName);
                    }
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    paddingLeft: `${(props.level) * 12 + 4}px`,
                    cursor: 'pointer',
                    backgroundColor: props.isSelected ? '#0078d433' : 'transparent',
                    borderLeft: props.isSelected ? '2px solid #0078d4' : '2px solid transparent',
                    color: props.isSelected ? '#fff' : '#ccc',
                    transition: 'background-color 0.1s'
                }}
                className="element-tree-item"
            >
                <style>
                    {`
                    .element-tree-item:hover .inspect-button {
                        opacity: 0.8 !important;
                    }
                    .inspect-button:hover {
                        background-color: #ffffff22;
                        opacity: 1 !important;
                    }
                    `}
                </style>
                <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', opacity: 0.3 }}>
                    <GripVertical size={14} />
                </div>
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '20px',
                        justifyContent: 'center',
                        opacity: props.data._Children && props.data._Children.length > 0 ? 0.8 : 0
                    }}
                >
                    {props.data._Children && props.data._Children.length > 0 ? (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : null}
                </div>
                {getIcon(props.data.As || '')}
                <Text size={200} weight={props.isSelected ? 'semibold' : 'regular'} style={{ marginLeft: '4px', flex: 1 }}>
                    {props.data.ControlName}
                </Text>

                <div
                    className="inspect-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (props.onInspectControl) props.onInspectControl(props.data.ControlName);
                    }}
                    style={{
                        opacity: 0,
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'opacity 0.2s, background-color 0.2s'
                    }}
                    title="View Properties"
                >
                    <Settings size={14} />
                </div>
            </div>
            {props.data._Children && isExpanded && (
                <SortableContext
                    items={props.data._Children.map((c: any) => c.ControlName)}
                    strategy={verticalListSortingStrategy}
                >
                    {props.data._Children.map((child: any) => (
                        <SortableTreeItem
                            key={child.ControlName}
                            id={child.ControlName}
                            data={child}
                            level={props.level + 1}
                            isSelected={props.selectedControlName === child.ControlName}
                            onSelectControl={props.onSelectControl}
                            onInspectControl={props.onInspectControl}
                            onContextMenu={props.onContextMenu}
                            onMoveControl={props.onMoveControl}
                            selectedControlName={props.selectedControlName}
                        />
                    ))}
                </SortableContext>
            )}
        </div>
    );
};

export const ElementTree: React.FC<ElementTreeProps> = ({
    data,
    selectedControlName,
    onSelectControl,
    onInspectControl,
    onContextMenu,
    onMoveControl,
    level = 0
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id && onMoveControl) {
            // For now, simpler implementation: just reorder base on the strategy in App.tsx
            onMoveControl(active.id as string, over.id as string, 'after');
        }
    }

    if (!data) return null;

    // If data is the root object
    if (level === 0 && !data.As) {
        const items = Object.keys(data);
        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {items.map(key => (
                            <SortableTreeItem
                                key={key}
                                id={key}
                                data={data[key]}
                                level={level + 1}
                                isSelected={selectedControlName === key}
                                onSelectControl={onSelectControl}
                                onInspectControl={onInspectControl}
                                onContextMenu={onContextMenu}
                                onMoveControl={onMoveControl}
                                selectedControlName={selectedControlName}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        );
    }

    return null; // The recursion is handled by SortableTreeItem
};
