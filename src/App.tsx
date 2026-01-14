import React, { useState, useEffect } from 'react';
import {
  FluentProvider,
  webDarkTheme,
  Button,
  Text,
  Tab,
  TabList,
  Badge,
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Switch,
  Input,
  Textarea
} from '@fluentui/react-components';

// ... (other imports remain the same, just adding Switch, Input, Textarea above)
import {
  FileCode,
  Layout,
  Database,
  Maximize2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { parsePowerYAML } from './utils/parser';
import { validatePowerAppStart, type ValidationError } from './utils/validator';
import ControlMapper from './components/ControlMapper';
import './index.css';
import { PowerFxProvider, usePowerFx } from './context/PowerFxContext';
import { findControlsUsingVariable } from './utils/searchUtils';

const VariablesDisplay: React.FC<{ onExpandVariable: (varName: string, expanded: boolean) => void }> = ({ onExpandVariable }) => {
  const { variables, execute } = usePowerFx();
  const hasVariables = Object.keys(variables).length > 0;

  if (!hasVariables) {
    return <Text style={{ fontStyle: 'italic', color: '#888', padding: '10px' }}>No variables defined yet.</Text>;
  }

  const handleValueChange = (key: string, newValue: any) => {
    // Helper to format value for Set()
    let valueStr = JSON.stringify(newValue);
    if (typeof newValue === 'string') {
      // Strings need simpler quoting if JSON.stringify over-escapes? 
      // Actually standard JSON stringify is probably safe for "Set(Var, "Val")"
    }
    // Execute Set(VarName, Value)
    execute(`Set(${key}, ${valueStr})`);
  };

  return (
    <Accordion collapsible onToggle={(_e, data) => {
      // handleExpandVariable(varName)
      // data.value is the item value (the variable name)
      // data.openItems contains the currently open items.
      // Wait, data.value is the toggled item.
      // We need to know if it OPENED or CLOSED.
      // Fluent UI Accordion onToggle doesn't explicitly say "opened", generally we check if value is in openItems.
      // But for 'collapsible' (single expand?), data.openItems might be just the one.
      // Let's assume we just pass the variable name and let the handler re-scan usage.
      // If we collapse, we probably want to CLEAR highlight?
      // Actually `handleExpandVariable` implementation in App.tsx toggles checks.
      // Let's pass the value.
      // Wait, the prop I defined `onExpandVariable` takes (name, boolean).
      // Fluent UI `onToggle` provides `AccordionToggleEvent` and `AccordionToggleData`.
      // `AccordionToggleData`: { value: unknown, openItems: unknown[] }

      // Check if the toggled item is now in `openItems`.
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

            {/* Editor based on Type */}
            {typeof value === 'boolean' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Switch
                  checked={value}
                  onChange={(_e, data) => handleValueChange(key, data.checked)}
                />
                <Text style={{ color: value ? '#4caf50' : '#f44336' }}>{String(value)}</Text>
              </div>
            ) : typeof value === 'number' ? (
              <Input
                type="number"
                value={value.toString()}
                onChange={(_e, data) => handleValueChange(key, parseFloat(data.value))}
                style={{ width: '100%' }}
              />
            ) : typeof value === 'string' ? (
              <Input
                value={value}
                onChange={(_e, data) => handleValueChange(key, data.value)}
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

import defaultYaml from './default.yaml?raw';

const App: React.FC = () => {
  const [yamlContent, setYamlContent] = useState<string>(defaultYaml);
  const [mockData, setMockData] = useState<string>('{\n  "Items": []\n}');
  const [parsedData, setParsedData] = useState<any>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<string>('inspector');
  const [highlightedControls, setHighlightedControls] = useState<Set<string>>(new Set());

  const handleExpandVariable = (varName: string, expanded: boolean) => {
    if (expanded && parsedData) {
      const controls = findControlsUsingVariable(parsedData, varName);
      setHighlightedControls(controls);
    } else {
      setHighlightedControls(new Set());
    }
  };

  const processYaml = () => {
    const data = parsePowerYAML(yamlContent);
    setParsedData(data);

    if (data) {
      const issues = validatePowerAppStart(data);
      setValidationIssues(issues);
      // Auto-switch to issues tab if there are errors (optional, maybe just show badge)
    } else {
      setValidationIssues([]);
    }
  };

  useEffect(() => {
    processYaml();
  }, [yamlContent]);

  return (
    <PowerFxProvider>
      <FluentProvider theme={webDarkTheme}>
        <div className="app-container">
          {/* Left Pane: Controls & Editor */}
          <aside className="pane">
            <header className="pane-header">
              <FileCode size={20} />
              <Text weight="semibold">Controls & Data</Text>
            </header>
            <div className="pane-content" style={{ padding: '0' }}>
              <div style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                <Button appearance="primary" size="small">Open Local YAML</Button>
                <Button
                  icon={<RefreshCw size={16} />}
                  onClick={processYaml}
                  title="Refresh & Validate"
                  size="small"
                >
                  Refresh
                </Button>
              </div>

              <Accordion collapsible defaultOpenItems="editor" style={{ width: '100%' }}>
                <AccordionItem value="editor">
                  <AccordionHeader>YAML Editor</AccordionHeader>
                  <AccordionPanel>
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
                    <VariablesDisplay onExpandVariable={handleExpandVariable} />
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </div>
          </aside>

          {/* Center Pane: Canvas */}
          <main className="center-pane">
            <header className="pane-header" style={{ width: '100%', position: 'absolute', top: 0 }}>
              <Layout size={20} />
              <Text weight="semibold">Canvas Viewport</Text>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <Button size="small" icon={<Maximize2 size={16} />}>Fit</Button>
              </div>
            </header>

            <div className="canvas-container" style={{ width: '1366px', height: '768px', overflow: 'hidden' }}>
              {parsedData && Object.keys(parsedData).map(key => (
                <ControlMapper key={key} control={parsedData[key]} highlightedControls={highlightedControls} />
              ))}
            </div>

            <footer style={{ position: 'absolute', bottom: 10, right: 10 }}>
              <Text size={100} style={{ color: '#666' }}>Resizing Coming Soon</Text>
            </footer>
          </main>

          {/* Right Pane: Inspector */}
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
        </div>
      </FluentProvider>
    </PowerFxProvider>
  );
};

export default App;
