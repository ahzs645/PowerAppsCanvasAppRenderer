import React from 'react';
import {
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
} from '@fluentui/react-components';
import {
    Copy,
    Edit2,
    Eye,
    Type,
    Trash2,
} from 'lucide-react';

interface ControlContextMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position: { x: number; y: number };
    controlName: string;
    onCopy: (name: string) => void;
    onEdit: (name: string) => void;
    onView: (name: string) => void;
    onRename: (name: string) => void;
    onRemove: (name: string) => void;
}

export const ControlContextMenu: React.FC<ControlContextMenuProps> = ({
    open,
    onOpenChange,
    position,
    controlName,
    onCopy,
    onEdit,
    onView,
    onRename,
    onRemove,
}) => {
    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 10000,
                pointerEvents: 'none'
            }}
        >
            <Menu open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
                <MenuTrigger disableButtonEnhancement>
                    <div style={{ width: 1, height: 1 }} />
                </MenuTrigger>
                <MenuPopover>
                    <MenuList>
                        <MenuItem
                            icon={<Copy size={14} />}
                            onClick={() => onCopy(controlName)}
                        >
                            Copy YAML
                        </MenuItem>
                        <MenuItem
                            icon={<Edit2 size={14} />}
                            onClick={() => onEdit(controlName)}
                        >
                            Edit Properties
                        </MenuItem>
                        <MenuItem
                            icon={<Eye size={14} />}
                            onClick={() => onView(controlName)}
                        >
                            View YAML
                        </MenuItem>
                        <MenuItem
                            icon={<Type size={14} />}
                            onClick={() => onRename(controlName)}
                        >
                            Rename
                        </MenuItem>
                        <MenuItem
                            icon={<Trash2 size={14} />}
                            onClick={() => onRemove(controlName)}
                            style={{ color: '#ff5252' }}
                        >
                            Remove
                        </MenuItem>
                    </MenuList>
                </MenuPopover>
            </Menu>
        </div>
    );
};
