import React from 'react';
import {
    Text,
    Input,
    Label,
    Divider,
} from '@fluentui/react-components';
import yaml from 'js-yaml';
import { getControlSchema } from '../../models/ControlRegistry';

interface PropertiesEditorProps {
    selectedControlName: string | null;
    yamlContent: string;
    onYamlChange: (content: string) => void;
    parsedData: Record<string, any> | null;
}

export const PropertiesEditor: React.FC<PropertiesEditorProps> = ({
    selectedControlName,
    yamlContent,
    onYamlChange,
    parsedData
}) => {
    if (!selectedControlName || !parsedData) return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Select an element to see its properties</div>;

    // Find the control in the parsed data (flat search for simplicity)
    const findControl = (data: any, name: string): any => {
        if (!data) return null;
        if (data.ControlName === name) return data;
        if (data._Children) {
            for (const child of data._Children) {
                const found = findControl(child, name);
                if (found) return found;
            }
        }
        if (typeof data === 'object' && !data.As) {
            for (const key in data) {
                const found = findControl(data[key], name);
                if (found) return found;
            }
        }
        return null;
    };

    const control = findControl(parsedData, selectedControlName);

    if (!control) return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Control not found</div>;

    const schema = getControlSchema(control.As || '');

    const handlePropertyChange = (propName: string, newValue: any) => {
        try {
            const raw = yaml.load(yamlContent) as any;

            const updateInControl = (node: any) => {
                if (!node.Properties) node.Properties = {};
                node.Properties[propName] = newValue;
            };

            const findAndReplace = (node: any) => {
                if (node.Screens) {
                    for (const screenName of Object.keys(node.Screens)) {
                        if (screenName === selectedControlName) {
                            updateInControl(node.Screens[screenName]);
                            return true;
                        }
                        if (findInChildren(node.Screens[screenName])) return true;
                    }
                }
                return false;
            };

            const findInChildren = (node: any) => {
                if (node.Children) {
                    for (const childObj of node.Children) {
                        const childName = Object.keys(childObj)[0];
                        if (childName === selectedControlName) {
                            updateInControl(childObj[childName]);
                            return true;
                        }
                        if (findInChildren(childObj[childName])) return true;
                    }
                }
                return false;
            };

            findAndReplace(raw);
            const newYaml = yaml.dump(raw, { indent: 2, lineWidth: -1 });
            onYamlChange(newYaml);
        } catch (e) {
            console.error('Error updating YAML:', e);
        }
    };

    const handleVersionChange = (newVersion: string) => {
        try {
            const raw = yaml.load(yamlContent) as any;

            const updateVersion = (node: any) => {
                if (node.Control) {
                    const parts = node.Control.split('@');
                    node.Control = `${parts[0]}@${newVersion}`;
                }
            };

            const findAndReplace = (node: any) => {
                if (node.Screens) {
                    for (const screenName of Object.keys(node.Screens)) {
                        if (screenName === selectedControlName) {
                            updateVersion(node.Screens[screenName]);
                            return true;
                        }
                        if (findInChildren(node.Screens[screenName])) return true;
                    }
                }
                return false;
            };

            const findInChildren = (node: any) => {
                if (node.Children) {
                    for (const childObj of node.Children) {
                        const childName = Object.keys(childObj)[0];
                        if (childName === selectedControlName) {
                            updateVersion(childObj[childName]);
                            return true;
                        }
                        if (findInChildren(childObj[childName])) return true;
                    }
                }
                return false;
            };

            findAndReplace(raw);
            const newYaml = yaml.dump(raw, { indent: 2, lineWidth: -1 });
            onYamlChange(newYaml);
        } catch (e) {
            console.error('Error updating version:', e);
        }
    };

    // Get current version from YAML if possible
    const getCurrentVersion = () => {
        try {
            const raw = yaml.load(yamlContent) as any;
            const findIn = (node: any): string | null => {
                if (node.Screens) {
                    for (const name of Object.keys(node.Screens)) {
                        if (name === selectedControlName) return node.Screens[name].Control?.split('@')[1] || '1';
                        const res = findInChild(node.Screens[name]);
                        if (res) return res;
                    }
                }
                return null;
            };
            const findInChild = (node: any): string | null => {
                if (node.Children) {
                    for (const childObj of node.Children) {
                        const name = Object.keys(childObj)[0];
                        if (name === selectedControlName) return childObj[name].Control?.split('@')[1] || '1';
                        const res = findInChild(childObj[name]);
                        if (res) return res;
                    }
                }
                return null;
            };
            return findIn(raw) || '1';
        } catch { return '1'; }
    };

    const currentVersion = getCurrentVersion();
    const properties = schema ? schema.properties : [];
    const existingPropNames = Object.keys(control).filter(k => !['_Children', 'As', 'ControlName', 'Control', 'Properties'].includes(k));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px' }}>
            <header style={{ marginBottom: '5px' }}>
                <Text weight="bold" size={400}>{control.ControlName}</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <Text size={100} style={{ color: '#888' }}>Type: {control.As}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Label size="small" style={{ fontSize: '10px', color: '#666' }}>Ver:</Label>
                        <Input
                            size="small"
                            value={currentVersion}
                            onChange={(_, data) => handleVersionChange(data.value)}
                            style={{ width: '40px', height: '20px', minWidth: 'unset', fontSize: '10px' }}
                        />
                    </div>
                </div>
            </header>

            <Divider />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Text size={100} weight="semibold" style={{ color: '#aaa', textTransform: 'uppercase' }}>Properties</Text>

                {properties.map(prop => {
                    const isSet = existingPropNames.includes(prop.name);
                    const value = control[prop.name] !== undefined ? control[prop.name] : prop.defaultValue;

                    return (
                        <div key={prop.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Label size="small" style={{ color: isSet ? '#0078d4' : '#888', fontWeight: isSet ? 'semibold' : 'normal' }}>
                                    {prop.name}
                                </Label>
                                {!isSet && <Text size={100} style={{ color: '#555', fontStyle: 'italic' }}>default</Text>}
                            </div>
                            <Input
                                size="small"
                                value={String(value || '')}
                                onChange={(_, data) => handlePropertyChange(prop.name, data.value)}
                                style={{
                                    fontFamily: 'monospace',
                                    borderLeft: isSet ? '2px solid #0078d4' : '2px solid transparent'
                                }}
                                placeholder={String(prop.defaultValue || '')}
                            />
                        </div>
                    );
                })}

                {/* Show any properties that are in YAML but NOT in schema */}
                {existingPropNames.filter(name => !properties.find(p => p.name === name)).map(name => (
                    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Label size="small" style={{ color: '#e0a100' }}>{name} (Unknown)</Label>
                        </div>
                        <Input
                            size="small"
                            value={String(control[name] || '')}
                            onChange={(_, data) => handlePropertyChange(name, data.value)}
                            style={{ fontFamily: 'monospace', borderLeft: '2px solid #e0a100' }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
