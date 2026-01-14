import React, { useState } from 'react';
import {
    Text,
    Tab,
    TabList,
    Badge
} from '@fluentui/react-components';
import {
    Database,
    AlertTriangle
} from 'lucide-react';
import type { ValidationError } from '../../utils/validator';

interface PropertiesPanelProps {
    parsedData: Record<string, any> | null;
    validationIssues: ValidationError[];
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    parsedData,
    validationIssues
}) => {
    const [activeTab, setActiveTab] = useState<string>('inspector');

    return (
        <aside className="pane pane-right">
            <header className="pane-header">
                <Database size={20} />
                <Text weight="semibold">YAML Inspector</Text>
            </header>

            <div style={{ padding: '0 10px' }}>
                <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value as string)}>
                    <Tab value="inspector">Tree</Tab>
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

            <div className="pane-content" style={{ marginTop: '0' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0' }}>
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
        </aside>
    );
};
