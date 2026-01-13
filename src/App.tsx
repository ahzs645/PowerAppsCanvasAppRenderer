import React, { useState, useEffect } from 'react';
import {
  FluentProvider,
  webDarkTheme,
  Button,
  Text,
  Title2,
  Divider,
} from '@fluentui/react-components';
import {
  FileCode,
  Layout,
  Database,
  Maximize2
} from 'lucide-react';
import { parsePowerYAML } from './utils/parser';
import ControlMapper from './components/ControlMapper';
import './index.css';

const DEFAULT_YAML = `
Screen1 As screen:
    Fill: =RGBA(255, 255, 255, 1)
    
    Label1 As label:
        Text: ="Welcome to PowerYAML Previewer"
        X: 40
        Y: 60
        Width: 300
        Height: 50
        Size: 24
        
    Button1 As button:
        Text: ="Click Me"
        X: 40
        Y: 150
        Width: 160
        Height: 40
        
    Input1 As textinput:
        Default: ="Sample input"
        X: 40
        Y: 210
        Width: 280
        Height: 40
`;

const App: React.FC = () => {
  const [yamlContent, setYamlContent] = useState<string>(DEFAULT_YAML);
  const [mockData, setMockData] = useState<string>('{\n  "Items": []\n}');
  const [parsedData, setParsedData] = useState<any>(null);

  useEffect(() => {
    const data = parsePowerYAML(yamlContent);
    setParsedData(data);
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
            <div style={{ marginTop: '20px', marginBottom: '10px' }}>
              <Button appearance="primary">Open Local YAML</Button>
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

          <div className="canvas-container" style={{ width: '375px', height: '667px' }}>
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
            <Text weight="semibold">YAML Tree Inspector</Text>
          </header>
          <div className="pane-content">
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
          </div>
        </aside>
      </div>
    </FluentProvider>
  );
};

export default App;
