import React, { useState, useEffect } from 'react';
import {
  FluentProvider,
  webDarkTheme,
  Button,
  Text,
  Title2,
  Divider,
  Tab,
  TabList,
  Badge
} from '@fluentui/react-components';
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

const DEFAULT_YAML = `
Screens:
  ConsultarDIs:
    Properties:
      Fill: =RGBA(243, 242, 241, 1)
      LoadingSpinnerColor: =RGBA(56, 96, 178, 1)
      OnVisible: =Set(ButonRefreshDisabled, DisplayMode.Edit) && Set(ModalLoadingVisible, false);Set(misDocumentos, Filter('Documentos de Identificación de Residuos',  'Creado por'.Email = User().Email, Estado.Value = "Borrador"));
    Children:
      - Footer_2:
          Control: GroupContainer@1.4.0
          Variant: ManualLayout
          Properties:
            DropShadow: =DropShadow.None
            Fill: =RGBA(255, 255, 255, 1)
            Height: =60
            RadiusBottomLeft: =0
            RadiusBottomRight: =0
            RadiusTopLeft: =0
            RadiusTopRight: =0
            Width: =1366
            Y: =708
          Children:
            - RectangleObra:
                Control: Rectangle@2.3.0
                Properties:
                  BorderColor: =RGBA(0, 18, 107, 1)
                  Fill: =RGBA(137, 207, 240, 1)
                  Height: =12
                  Width: =94
                  X: =1058
                  Y: =13
            - RectangleVertedero:
                Control: Rectangle@2.3.0
                Properties:
                  BorderColor: =RGBA(0, 18, 107, 1)
                  Fill: =RGBA(144, 238, 144, 1)
                  Height: =12
                  Width: =94
                  X: =1058
                  Y: =36
            - LabelObra:
                Control: Label@2.5.1
                Properties:
                  BorderColor: =RGBA(0, 18, 107, 1)
                  Font: =Font.'Open Sans'
                  Height: =25
                  Size: =12
                  Text: ="Obra"
                  X: =1157
                  Y: =6
            - LabelVertedero:
                Control: Label@2.5.1
                Properties:
                  BorderColor: =RGBA(0, 18, 107, 1)
                  Font: =Font.'Open Sans'
                  Height: =25
                  Size: =12
                  Text: ="Vertedero"
                  X: =1157
                  Y: =29
`;

const App: React.FC = () => {
  const [yamlContent, setYamlContent] = useState<string>(DEFAULT_YAML);
  const [mockData, setMockData] = useState<string>('{\n  "Items": []\n}');
  const [parsedData, setParsedData] = useState<any>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<string>('inspector');

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
    <FluentProvider theme={webDarkTheme}>
      <div className="app-container">
        {/* Left Pane: Controls & Editor */}
        <aside className="pane">
          <header className="pane-header">
            <FileCode size={20} />
            <Text weight="semibold">Controls & Data</Text>
          </header>
          <div className="pane-content">
            <Title2>Editor</Title2>
            <div style={{ marginTop: '20px', marginBottom: '10px', display: 'flex', gap: '8px' }}>
              <Button appearance="primary">Open Local YAML</Button>
              <Button
                icon={<RefreshCw size={16} />}
                onClick={processYaml}
                title="Refresh & Validate"
              >
                Refresh
              </Button>
            </div>

            <textarea
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              placeholder="Paste PowerYAML here..."
              style={{
                width: '100%',
                height: '300px',
                backgroundColor: '#111',
                color: '#ddd',
                border: '1px solid #333',
                borderRadius: '4px',
                fontFamily: 'monospace',
                padding: '8px',
                fontSize: '12px'
              }}
            />

            <Divider style={{ margin: '20px 0' }} />

            <Text weight="semibold">Mock Data JSON</Text>
            <textarea
              value={mockData}
              onChange={(e) => setMockData(e.target.value)}
              style={{
                width: '100%',
                height: '150px',
                marginTop: '10px',
                backgroundColor: '#111',
                color: '#0f0',
                border: '1px solid #333',
                borderRadius: '4px',
                fontFamily: 'monospace',
                padding: '8px',
                fontSize: '12px'
              }}
            />
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
              <ControlMapper key={key} control={parsedData[key]} />
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
                overflow: 'auto'
              }}>
                <pre>{JSON.stringify(parsedData, null, 2)}</pre>
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
  );
};

export default App;
