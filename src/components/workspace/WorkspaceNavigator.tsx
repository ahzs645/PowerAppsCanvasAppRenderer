import React, { useState } from 'react';
import {
    Button,
    Text,
    Input
} from '@fluentui/react-components';
import {
    Plus,
    Trash2,
    ChevronRight,
    Monitor,
    Edit2,
    Code,
    Save,
    Home
} from 'lucide-react';
import type { UserWorkspace, AppInstance, Screen } from '../../types';

interface WorkspaceNavigatorProps {
    workspace: UserWorkspace;
    onSelectApp: (appId: string) => void;
    onSelectScreen: (screenId: string) => void;
    onCreateApp: () => void;
    onCreateScreen: (appId: string) => void;
    onDeleteApp: (appId: string) => void;
    onDeleteScreen: (appId: string, screenId: string) => void;
    onRenameApp: (appId: string, newName: string) => void;
    onRenameScreen: (appId: string, screenId: string, newName: string) => void;
    onEditScreenYaml: (appId: string, screenId: string) => void;
    onSaveScreenYaml: (appId: string, screenId: string) => void;
    onSetStartScreen: (appId: string, screenId: string) => void;
}

export const WorkspaceNavigator: React.FC<WorkspaceNavigatorProps> = ({
    workspace,
    onSelectApp,
    onSelectScreen,
    onCreateApp,
    onCreateScreen,
    onDeleteApp,
    onDeleteScreen,
    onRenameApp,
    onRenameScreen,
    onEditScreenYaml,
    onSaveScreenYaml,
    onSetStartScreen
}) => {
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleAppRename = (app: AppInstance) => {
        setEditingAppId(app.id);
        setEditingName(app.name);
    };

    const handleScreenRename = (screen: Screen) => {
        setEditingScreenId(screen.id);
        setEditingName(screen.name);
    };

    const saveAppName = (appId: string) => {
        if (editingName.trim()) {
            onRenameApp(appId, editingName.trim());
        }
        setEditingAppId(null);
        setEditingName('');
    };

    const saveScreenName = (appId: string, screenId: string) => {
        if (editingName.trim()) {
            onRenameScreen(appId, screenId, editingName.trim());
        }
        setEditingScreenId(null);
        setEditingName('');
    };

    const cancelEdit = () => {
        setEditingAppId(null);
        setEditingScreenId(null);
        setEditingName('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold">My Apps ({workspace.apps.length}/3)</Text>
                <Button
                    className="modern-button primary"
                    icon={<Plus size={16} />}
                    size="small"
                    onClick={onCreateApp}
                    disabled={workspace.apps.length >= 3}
                    appearance="primary"
                >
                    Add App
                </Button>
            </div>

            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workspace.apps.map(app => (
                    <div key={app.id} className={`workspace-app-card ${app.id === workspace.activeAppId ? 'active' : ''}`}>
                        <div
                            style={{
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onClick={() => onSelectApp(app.id)}
                        >
                            <Monitor size={18} color={app.id === workspace.activeAppId ? '#0078d4' : '#64748b'} />
                            {editingAppId === app.id ? (
                                <Input
                                    className="modern-input"
                                    value={editingName}
                                    onChange={(_, data) => setEditingName(data.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveAppName(app.id);
                                        if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onBlur={() => saveAppName(app.id)}
                                    size="small"
                                    style={{ flex: 1 }}
                                    autoFocus
                                />
                            ) : (
                                <Text
                                    weight={app.id === workspace.activeAppId ? 'bold' : 'regular'}
                                    style={{
                                        flex: 1,
                                        color: app.id === workspace.activeAppId ? '#ffffff' : '#e2e8f0'
                                    }}
                                >
                                    {app.name}
                                </Text>
                            )}
                            <Button
                                className="modern-button"
                                icon={<Edit2 size={14} />}
                                size="small"
                                appearance="subtle"
                                onClick={(e) => { e.stopPropagation(); handleAppRename(app); }}
                            />
                            <Button
                                className="modern-button"
                                icon={<Trash2 size={14} />}
                                size="small"
                                appearance="subtle"
                                onClick={(e) => { e.stopPropagation(); onDeleteApp(app.id); }}
                            />
                        </div>

                        {app.id === workspace.activeAppId && (
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <Text size={200} style={{ color: '#94a3b8' }}>Screens ({app.screens.length}/4)</Text>
                                    <Button
                                        className="modern-button"
                                        icon={<Plus size={12} />}
                                        size="small"
                                        onClick={() => onCreateScreen(app.id)}
                                        disabled={app.screens.length >= 4}
                                        appearance="subtle"
                                        style={{ minWidth: 'auto', height: '24px' }}
                                    />
                                </div>
                                {app.screens.map(screen => (
                                    <div
                                        key={screen.id}
                                        className={`workspace-screen-item ${screen.id === workspace.activeScreenId ? 'active' : ''}`}
                                        style={{
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => onSelectScreen(screen.id)}
                                    >
                                        <ChevronRight size={14} color={screen.id === workspace.activeScreenId ? '#0078d4' : '#64748b'} />
                                        {editingScreenId === screen.id ? (
                                            <Input
                                                className="modern-input"
                                                value={editingName}
                                                onChange={(_, data) => setEditingName(data.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveScreenName(app.id, screen.id);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                onBlur={() => saveScreenName(app.id, screen.id)}
                                                size="small"
                                                style={{ flex: 1, fontSize: '12px' }}
                                                autoFocus
                                            />
                                        ) : (
                                            <Text size={200} style={{ flex: 1 }}>{screen.name}</Text>
                                        )}
                                        <Button
                                            className="modern-button"
                                            icon={<Code size={12} />}
                                            size="small"
                                            appearance="subtle"
                                            onClick={(e) => { e.stopPropagation(); onEditScreenYaml(app.id, screen.id); }}
                                            style={{ minWidth: 'auto', height: '20px', padding: '4px' }}
                                            title="Edit YAML"
                                        />
                                        <Button
                                            className="modern-button"
                                            icon={<Save size={12} />}
                                            size="small"
                                            appearance="subtle"
                                            onClick={(e) => { e.stopPropagation(); onSaveScreenYaml(app.id, screen.id); }}
                                            style={{ minWidth: 'auto', height: '20px', padding: '4px' }}
                                            title="Save YAML"
                                        />
                                        <Button
                                            className="modern-button"
                                            icon={<Edit2 size={12} />}
                                            size="small"
                                            appearance="subtle"
                                            onClick={(e) => { e.stopPropagation(); handleScreenRename(screen); }}
                                            style={{ minWidth: 'auto', height: '20px', padding: '4px' }}
                                            title="Rename Screen"
                                        />
                                        <Button
                                            className="modern-button"
                                            icon={<Trash2 size={12} />}
                                            size="small"
                                            appearance="subtle"
                                            onClick={(e) => { e.stopPropagation(); onDeleteScreen(app.id, screen.id); }}
                                            style={{ minWidth: 'auto', height: '20px', padding: '4px' }}
                                            title="Delete Screen"
                                        />
                                        <Button
                                            className="modern-button"
                                            icon={<Home size={12} fill={app.startScreenId === screen.id ? "#0078d4" : "none"} />}
                                            size="small"
                                            appearance="subtle"
                                            onClick={(e) => { e.stopPropagation(); onSetStartScreen(app.id, screen.id); }}
                                            style={{ minWidth: 'auto', height: '20px', padding: '4px' }}
                                            title={app.startScreenId === screen.id ? "Start Screen" : "Set as Start Screen"}
                                            color={app.startScreenId === screen.id ? "brand" : "neutral"}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
