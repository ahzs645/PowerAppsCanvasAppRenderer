import React, { useState } from 'react';
import {
    Text,
    Tab,
    TabList,
    Badge
} from '@fluentui/react-components';
import {
    Layout,
    AlertTriangle,
} from 'lucide-react';
import type { ValidationError } from '../../utils/validator';
import { ElementTree } from './ElementTree';
import { PropertiesEditor } from './PropertiesEditor';

interface PropertiesPanelProps {
    parsedData: Record<string, any> | null;
    validationIssues: ValidationError[];
    selectedControlName: string | null;
    onSelectControl: (name: string | null) => void;
    onInspectControl?: (name: string | null) => void;
    onContextMenu?: (e: React.MouseEvent, name: string) => void;
    onMoveControl?: (sourceName: string, targetName: string, position: 'before' | 'after' | 'inside') => void;
    yamlContent: string;
    onYamlChange: (content: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    parsedData,
    validationIssues,
    selectedControlName,
    onSelectControl,
    onInspectControl,
    onContextMenu,
    onMoveControl,
    yamlContent,
    onYamlChange
}) => {
    const [activeTab, setActiveTab] = useState<string>('elements');

    return (
        <aside className="pane pane-right" >
            <header className="pane-header">
                <Layout size={20} />
                <Text weight="semibold">Inspector</Text>
            </header>

            <div style={{ padding: '0 10px' }}>
                <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value as string)}>
                    <Tab value="elements">Elements</Tab>
                    <Tab value="properties">Props</Tab>
                    <Tab value="inspector">JSON</Tab>
                    <Tab value="issues">
                        Issues
                        {validationIssues.length > 0 && (
                            <Badge appearance="filled" color="danger" style={{ marginLeft: '5px' }}>
                                {validationIssues.length}
                            </Badge>
                        )}
                    </Tab>
                </TabList>
            </div>

            <div className="pane-content" style={{ marginTop: '0', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'elements' && (
                    <div style={{ height: '100%', overflow: 'auto' }}>
                        <ElementTree
                            data={parsedData}
                            selectedControlName={selectedControlName}
                            onSelectControl={onSelectControl}
                            onInspectControl={(name) => {
                                if (onInspectControl) onInspectControl(name);
                                setActiveTab('properties');
                            }}
                            onContextMenu={onContextMenu}
                            onMoveControl={onMoveControl}
                        />
                    </div>
                )}

                {activeTab === 'properties' && (
                    <div style={{ height: '100%', overflow: 'auto' }}>
                        <PropertiesEditor
                            selectedControlName={selectedControlName}
                            parsedData={parsedData}
                            yamlContent={yamlContent}
                            onYamlChange={onYamlChange}
                        />
                    </div>
                )}

                {activeTab === 'inspector' && (
                    <div style={{
                        backgroundColor: '#111',
                        padding: '10px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        height: '100%',
                        overflow: 'auto',
                        boxSizing: 'border-box'
                    }}>
                        <pre style={{ margin: 0 }}>{JSON.stringify(parsedData, null, 2)}</pre>
                    </div>
                )}

                {activeTab === 'issues' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0', overflow: 'auto' }}>
                        {validationIssues.length === 0 ? (
                            <Text style={{ color: '#888', fontStyle: 'italic' }}>No issues found.</Text>
                        ) : (
                            validationIssues.map((issue, idx) => (
                                <div key={idx} style={{
                                    backgroundColor: '#2a1a1a',
                                    borderLeft: '3px solid #f44336',
                                    padding: '8px',
                                    borderRadius: '2px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <AlertTriangle size={14} color="#f44336" />
                                        <Text weight="semibold" style={{ color: '#ff8a80', fontSize: '12px' }}>
                                            {issue.type === 'unknown_control' ? 'Unknown Control' : 'Unknown Property'}
                                        </Text>
                                    </div>
                                    <Text style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                                        {issue.message}
                                    </Text>
                                    <Text style={{ display: 'block', fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
                                        Path: {issue.path}
                                    </Text>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </aside >
    );
};
