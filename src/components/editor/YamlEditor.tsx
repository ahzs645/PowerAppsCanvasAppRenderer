import React from 'react';
import {
    Button,
    Accordion,
    AccordionHeader,
    AccordionItem,
    AccordionPanel,
    Switch,
    Input,
    Textarea,
    Text
} from '@fluentui/react-components';
import {
    RefreshCw,
    Save as SaveIcon
} from 'lucide-react';
import { usePowerFx } from '../../context/PowerFxContext';


// Internal VariablesDisplay component (moved from App.tsx)
const VariablesDisplay: React.FC<{ onExpandVariable: (varName: string, expanded: boolean) => void }> = ({ onExpandVariable }) => {
    const { store, execute } = usePowerFx();
    const variables = store.vars;
    const hasVariables = Object.keys(variables).length > 0;

    if (!hasVariables) {
        return <Text style={{ fontStyle: 'italic', color: '#888', padding: '10px' }}>No variables defined yet.</Text>;
    }

    const handleValueChange = (key: string, newValue: string | number | boolean) => {
        let valueStr = JSON.stringify(newValue);
        execute(`Set(${key}, ${valueStr})`);
    };

    return (
        <Accordion collapsible onToggle={(_, data) => {
            const isOpen = data.openItems.includes(data.value);
            onExpandVariable(String(data.value), isOpen);
        }}>
            {Object.entries(variables).map(([key, value]) => (
                <AccordionItem key={key} value={key}>
                    <AccordionHeader style={{ background: '#252526', borderLeft: '3px solid #0078d4', borderRadius: '4px', marginBottom: '4px' }}>
                        <Text style={{ fontFamily: 'monospace', color: '#9cdcfe' }}>{key}</Text>
                    </AccordionHeader>
                    <AccordionPanel style={{ background: '#1e1e1e', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Text size={200} style={{ color: '#aaa', marginBottom: '4px' }}>Current Value:</Text>
                        {typeof value === 'boolean' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Switch
                                    checked={value}
                                    onChange={(_, data) => handleValueChange(key, data.checked)}
                                />
                                <Text style={{ color: value ? '#4caf50' : '#f44336' }}>{String(value)}</Text>
                            </div>
                        ) : typeof value === 'number' ? (
                            <Input
                                type="number"
                                value={value.toString()}
                                onChange={(_, data) => handleValueChange(key, parseFloat(data.value))}
                                style={{ width: '100%' }}
                            />
                        ) : typeof value === 'string' ? (
                            <Input
                                value={value}
                                onChange={(_, data) => handleValueChange(key, data.value)}
                                style={{ width: '100%' }}
                            />
                        ) : (
                            <Textarea
                                value={JSON.stringify(value, null, 2)}
                                readOnly
                                style={{ fontFamily: 'monospace', fontSize: '11px', height: '100px' }}
                            />
                        )}
                    </AccordionPanel>
                </AccordionItem>
            ))}
        </Accordion>
    );
};

interface YamlEditorProps {
    yamlContent: string;
    setYamlContent: (content: string) => void;
    mockData: string;
    setMockData: (data: string) => void;
    isSignedIn: boolean | undefined;
    onProcessYaml: () => void;
    onSave: () => void;
    onExpandVariable: (varName: string, expanded: boolean) => void;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({
    yamlContent,
    setYamlContent,
    mockData,
    setMockData,
    isSignedIn,
    onProcessYaml,
    onSave,
    onExpandVariable
}) => {
    return (
        <Accordion collapsible defaultOpenItems={["editor"]} style={{ width: '100%' }}>
            <AccordionItem value="editor">
                <AccordionHeader>YAML Editor</AccordionHeader>
                <AccordionPanel>
                    {isSignedIn && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <Button appearance="primary" size="small">Open Local YAML</Button>
                            <Button
                                icon={<RefreshCw size={16} />}
                                onClick={onProcessYaml}
                                title="Refresh & Validate"
                                size="small"
                            >
                                Refresh
                            </Button>
                            <Button
                                icon={<SaveIcon size={16} />}
                                onClick={onSave}
                                title="Save to Storage & Download"
                                size="small"
                                appearance="subtle"
                            >
                                Save
                            </Button>
                        </div>
                    )}
                    <textarea
                        value={yamlContent}
                        onChange={(e) => setYamlContent(e.target.value)}
                        placeholder="Paste PowerYAML here..."
                        style={{
                            width: '100%',
                            height: '400px',
                            backgroundColor: '#111',
                            color: '#ddd',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            padding: '8px',
                            fontSize: '12px',
                            resize: 'vertical'
                        }}
                    />
                </AccordionPanel>
            </AccordionItem>

            <AccordionItem value="mock">
                <AccordionHeader>Mock Data</AccordionHeader>
                <AccordionPanel>
                    <textarea
                        value={mockData}
                        onChange={(e) => setMockData(e.target.value)}
                        style={{
                            width: '100%',
                            height: '200px',
                            backgroundColor: '#111',
                            color: '#0f0',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            padding: '8px',
                            fontSize: '12px',
                            resize: 'vertical'
                        }}
                    />
                </AccordionPanel>
            </AccordionItem>

            <AccordionItem value="variables">
                <AccordionHeader>Variables</AccordionHeader>
                <AccordionPanel>
                    <VariablesDisplay onExpandVariable={onExpandVariable} />
                </AccordionPanel>
            </AccordionItem>
        </Accordion>
    );
};
