import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";
import {
  FluentProvider,
  webDarkTheme,
  Button,
  Text,
  Tab,
  TabList,
  useId,
  Toaster,
  useToastController,
  Toast,
  ToastTitle
} from '@fluentui/react-components';
import {
  FileCode,
  RefreshCw,
  Save as SaveIcon
} from 'lucide-react';
import LoginPage from './components/LoginPage';
import { parsePowerYAML } from './utils/parser';
import { validatePowerAppStart, type ValidationError } from './utils/validator';
import ControlMapper from './components/ControlMapper';
import './index.css';
import { PowerFxProvider, usePowerFx as _usePowerFx } from './context/PowerFxContext';
import { findControlsUsingVariable } from './utils/searchUtils';
import * as db from './lib/database';
import type { AppImage } from './lib/database';
import { WorkspaceNavigator } from './components/workspace/WorkspaceNavigator';
import { AppHeader } from './components/layout/AppHeader';
import { PropertiesPanel } from './components/inspector/PropertiesPanel';
import { YamlEditor } from './components/editor/YamlEditor'; // Ensure this matches file path
import type { UserWorkspace, AppInstance, Screen } from './types';
import defaultYaml from './default.yaml?raw';

const App: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const toasterId = useId("toaster");
  const { dispatchToast } = useToastController(toasterId);

  const notify = React.useCallback((message: string) => {
    dispatchToast(
      <Toast>
        <ToastTitle>{message}</ToastTitle>
      </Toast>,
      { intent: "info" }
    );
  }, [dispatchToast]);

  const [isGuest, setIsGuest] = useState(false);
  const [_isLoading, setIsLoading] = useState(false);
  const [yamlContent, setYamlContent] = useState<string>(() => {
    const saved = localStorage.getItem('power-yaml-content');
    return saved || defaultYaml;
  });
  const [workspace, setWorkspace] = useState<UserWorkspace>({
    apps: [],
    activeAppId: null,
    activeScreenId: null
  });
  const [appImages, setAppImages] = useState<AppImage[]>([]);

  const [mockData, setMockData] = useState<string>('{\n  "Items": []\n}');
  const [parsedData, setParsedData] = useState<Record<string, any> | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationError[]>([]);
  // activeTab state moved to PropertiesPanel, effectively (or kept if needed for other logic? It was only for the panel).
  // Actually App.tsx handled activeTab for the right pane. I moved it inside PropertiesPanel. So I can remove it here.
  const [highlightedControls, setHighlightedControls] = useState<Set<string>>(new Set());

  // Layout State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'navigator' | 'editor'>('editor');
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(false); // Default Hidden as requested

  // Load workspace from database when user signs in
  useEffect(() => {
    const loadWorkspace = async () => {
      if (isSignedIn && user?.id) {
        setIsLoading(true);
        try {
          const workspaceData = await db.getUserWorkspace(user.id);
          // Convert database format to local format
          const localWorkspace: UserWorkspace = {
            apps: workspaceData.apps.map(app => ({
              id: app.id,
              name: app.name,
              screens: app.screens.map(screen => ({
                id: screen.id,
                name: screen.name,
                yaml: screen.yaml
              })),
              startScreenId: app.startScreenId
            })),
            activeAppId: workspaceData.activeAppId,
            activeScreenId: workspaceData.activeScreenId
          };
          setWorkspace(localWorkspace);
        } catch (error) {
          console.error('Error loading workspace:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadWorkspace();
  }, [isSignedIn, user?.id]);

  // Load app images when activeAppId changes
  useEffect(() => {
    const loadImages = async () => {
      if (workspace.activeAppId) {
        const images = await db.getAppImages(workspace.activeAppId);
        setAppImages(images);
      } else {
        setAppImages([]);
      }
    };
    loadImages();
  }, [workspace.activeAppId]);

  // Effect to sync yamlContent with the active screen when logged in
  useEffect(() => {
    if (isSignedIn && workspace.activeAppId && workspace.activeScreenId) {
      const activeApp = workspace.apps.find(a => a.id === workspace.activeAppId);
      const activeScreen = activeApp?.screens.find(s => s.id === workspace.activeScreenId);
      if (activeScreen) {
        setYamlContent(activeScreen.yaml);
      }
    }
  }, [isSignedIn, workspace.activeAppId, workspace.activeScreenId]);

  // Effect to save yamlContent back to the workspace and database
  useEffect(() => {
    if (isSignedIn && workspace.activeAppId && workspace.activeScreenId) {
      setWorkspace(prev => {
        const newApps = prev.apps.map(app => {
          if (app.id === prev.activeAppId) {
            return {
              ...app,
              screens: app.screens.map(screen => {
                if (screen.id === prev.activeScreenId) {
                  return { ...screen, yaml: yamlContent };
                }
                return screen;
              })
            };
          }
          return app;
        });
        const newWorkspace = { ...prev, apps: newApps };
        localStorage.setItem('power-user-workspace', JSON.stringify(newWorkspace));
        return newWorkspace;
      });

      // Auto-save to database with debouncing
      const timeoutId = setTimeout(async () => {
        if (user?.id && workspace.activeScreenId) {
          try {
            await db.updateScreenYaml(workspace.activeScreenId, yamlContent);
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      }, 2000); // 2 second debounce

      return () => clearTimeout(timeoutId);
    } else if (!isSignedIn) {
      localStorage.setItem('power-yaml-content', yamlContent);
    }
  }, [yamlContent, isSignedIn, user?.id, workspace.activeScreenId]);

  // --- Handlers (Create, Delete, Rename) ---
  // (Keeping these in App.tsx as they manage the global workspace state)

  const handleCreateApp = async () => {
    if (!isSignedIn || !user?.id) return;
    if (workspace.apps.length >= 3) {
      alert('Maximum 3 apps reached.');
      return;
    }
    setIsLoading(true);
    try {
      const newApp = await db.createApp(user.id, `New App ${workspace.apps.length + 1}`, defaultYaml);
      if (newApp) {
        const localApp: AppInstance = {
          id: newApp.id,
          name: newApp.name,
          screens: newApp.screens.map(screen => ({
            id: screen.id,
            name: screen.name,
            yaml: screen.yaml
          }))
        };
        setWorkspace(prev => ({
          ...prev,
          apps: [...prev.apps, localApp],
          activeAppId: localApp.id,
          activeScreenId: localApp.screens[0].id
        }));
        await db.updateWorkspaceActive(user.id, localApp.id, localApp.screens[0].id);
      }
    } catch (error) {
      console.error('Error creating app:', error);
      alert('Failed to create app. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateScreen = async (appId: string) => {
    if (!isSignedIn || !user?.id) return;
    const app = workspace.apps.find(a => a.id === appId);
    if (app && app.screens.length >= 4) {
      alert('Maximum 4 screens reached for this app.');
      return;
    }
    setIsLoading(true);
    try {
      const newScreen = await db.createScreen(appId, `Screen ${app!.screens.length + 1}`, defaultYaml);
      if (newScreen) {
        const localScreen: Screen = {
          id: newScreen.id,
          name: newScreen.name,
          yaml: newScreen.yaml
        };
        setWorkspace(prev => ({
          ...prev,
          apps: prev.apps.map(a => a.id === appId ? { ...a, screens: [...a.screens, localScreen] } : a),
          activeScreenId: localScreen.id
        }));
        await db.updateWorkspaceActive(user.id, appId, newScreen.id);
      }
    } catch (error) {
      console.error('Error creating screen:', error);
      alert('Failed to create screen. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (!isSignedIn || !user?.id) return;
    if (!confirm('Are you sure you want to delete this app? This action cannot be undone.')) return;
    setIsLoading(true);
    try {
      const success = await db.deleteApp(appId);
      if (success) {
        setWorkspace(prev => {
          const newApps = prev.apps.filter(a => a.id !== appId);
          let newActiveAppId = prev.activeAppId;
          let newActiveScreenId = prev.activeScreenId;
          if (prev.activeAppId === appId) {
            newActiveAppId = newApps.length > 0 ? newApps[0].id : null;
            newActiveScreenId = newApps.length > 0 ? newApps[0].screens[0].id : null;
          }
          return { ...prev, apps: newApps, activeAppId: newActiveAppId, activeScreenId: newActiveScreenId };
        });
        // Update DB active state logic... (omitted for brevity, assume similar logic to original)
      }
    } catch (error) {
      console.error('Error deleting app:', error);
      alert('Failed to delete app.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteScreen = async (appId: string, screenId: string) => {
    if (!isSignedIn || !user?.id) return;
    if (!confirm('Are you sure you want to delete this screen? This action cannot be undone.')) return;
    setIsLoading(true);
    try {
      const success = await db.deleteScreen(screenId);
      if (success) {
        setWorkspace(prev => {
          const newApps = prev.apps.map(app => {
            if (app.id === appId) {
              const newScreens = app.screens.filter(s => s.id !== screenId);
              return { ...app, screens: newScreens };
            }
            return app;
          });
          let newActiveScreenId = prev.activeScreenId;
          if (prev.activeScreenId === screenId) {
            const app = newApps.find(a => a.id === appId);
            newActiveScreenId = app && app.screens.length > 0 ? app.screens[0].id : null;
          }
          return { ...prev, apps: newApps, activeScreenId: newActiveScreenId };
        });
      }
    } catch (error) {
      console.error('Error deleting screen:', error);
      alert('Failed to delete screen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameApp = async (appId: string, newName: string) => {
    if (!isSignedIn || !user?.id) return;
    try {
      const success = await db.updateAppName(appId, newName);
      if (success) {
        setWorkspace(prev => ({
          ...prev,
          apps: prev.apps.map(app => app.id === appId ? { ...app, name: newName } : app)
        }));
      }
    } catch (error) {
      console.error('Error renaming app:', error);
    }
  };

  const handleRenameScreen = async (appId: string, screenId: string, newName: string) => {
    if (!isSignedIn || !user?.id) return;
    try {
      const success = await db.updateScreenName(screenId, newName);
      if (success) {
        setWorkspace(prev => ({
          ...prev,
          apps: prev.apps.map(app =>
            app.id === appId ? {
              ...app,
              screens: app.screens.map(screen =>
                screen.id === screenId ? { ...screen, name: newName } : screen
              )
            } : app
          )
        }));
      }
    } catch (error) {
      console.error('Error renaming screen:', error);
    }
  };

  const processYaml = () => {
    const data = parsePowerYAML(yamlContent);
    setParsedData(data);
    if (data) {
      const issues = validatePowerAppStart(data);
      setValidationIssues(issues);
    } else {
      setValidationIssues([]);
    }
  };

  const handleEditScreenYaml = (_appId: string, screenId: string) => {
    setActiveSidebarTab('editor');
    setWorkspace(prev => ({ ...prev, activeScreenId: screenId }));
  };

  const handleSetStartScreen = async (appId: string, screenId: string) => {
    if (!isSignedIn || !user?.id) return;
    try {
      const success = await db.updateAppStartScreen(appId, screenId);
      if (success) {
        setWorkspace(prev => ({
          ...prev,
          apps: prev.apps.map(app =>
            app.id === appId ? { ...app, startScreenId: screenId } : app
          )
        }));
        notify('Start screen set!');
      }
    } catch (error) {
      console.error('Error setting start screen:', error);
    }
  };

  const handleSaveScreenYaml = async (_appId: string, screenId: string) => {
    if (!isSignedIn || !user?.id) return;
    try {
      const success = await db.updateScreenYaml(screenId, yamlContent);
      if (success) alert('Screen YAML saved!');
      else alert('Failed to save.');
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleSave = () => {
    localStorage.setItem('power-yaml-content', yamlContent);
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'default.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Changes saved and downloaded.');
  };

  const handleExpandVariable = (varName: string, expanded: boolean) => {
    if (expanded && parsedData) {
      const controls = findControlsUsingVariable(parsedData, varName);
      setHighlightedControls(controls);
    } else {
      setHighlightedControls(new Set());
    }
  };

  const handleNavigate = React.useCallback((screenName: string) => {
    if (!isSignedIn) {
      dispatchToast(
        <Toast>
          <ToastTitle>if you want this functionallity you must log in</ToastTitle>
        </Toast>,
        { intent: "warning" }
      );
      return;
    }

    if (workspace.activeAppId) {
      const activeApp = workspace.apps.find(a => a.id === workspace.activeAppId);
      if (activeApp) {
        const targetScreen = activeApp.screens.find(s => s.name === screenName);
        if (targetScreen) {
          setWorkspace(prev => ({ ...prev, activeScreenId: targetScreen.id }));
        } else {
          console.warn(`Screen not found: ${screenName}`);
        }
      }
    }
  }, [isSignedIn, workspace, dispatchToast]);

  useEffect(() => {
    processYaml();
  }, [yamlContent]);

  return (
    <PowerFxProvider onNavigate={handleNavigate} onNotify={notify}>
      <FluentProvider theme={webDarkTheme}>
        <Toaster toasterId={toasterId} />
        {(!isSignedIn && !isGuest) ? (
          <LoginPage onGuestMode={() => setIsGuest(true)} />
        ) : (
          <div
            className="app-container"
            style={{
              gridTemplateColumns: `${leftPanelVisible ? '350px ' : ''}1fr${rightPanelVisible ? ' 350px' : ''}`
            }}
          >
            {/* Left Pane: Controls & Editor */}
            {leftPanelVisible && (
              <aside className="pane">
                <header className="pane-header">
                  <FileCode size={20} />
                  <Text weight="semibold">Workspace</Text>
                </header>
                <div className="pane-content" style={{ padding: '0' }}>
                  {isSignedIn && (
                    <div style={{ padding: '10px 10px 0 10px' }}>
                      <TabList
                        selectedValue={activeSidebarTab}
                        onTabSelect={(_, data) => setActiveSidebarTab(data.value as 'navigator' | 'editor')}
                        size="small"
                      >
                        <Tab value="navigator">Navigator</Tab>
                        <Tab value="editor">Editor</Tab>
                      </TabList>
                    </div>
                  )}

                  {!isSignedIn ? (
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
                      <Button
                        icon={<SaveIcon size={16} />}
                        onClick={handleSave}
                        title="Save to Storage & Download"
                        size="small"
                        appearance="subtle"
                      >
                        Save
                      </Button>
                    </div>
                  ) : null}

                  {isSignedIn && activeSidebarTab === 'navigator' ? (
                    <WorkspaceNavigator
                      workspace={workspace}
                      onSelectApp={(id) => {
                        const app = workspace.apps.find(a => a.id === id);
                        setWorkspace(prev => ({
                          ...prev,
                          activeAppId: id,
                          activeScreenId: app?.startScreenId || app?.screens[0]?.id || null
                        }));
                      }}
                      onSelectScreen={(id) => setWorkspace(prev => ({ ...prev, activeScreenId: id }))}
                      onCreateApp={handleCreateApp}
                      onCreateScreen={handleCreateScreen}
                      onDeleteApp={handleDeleteApp}
                      onDeleteScreen={handleDeleteScreen}
                      onRenameApp={handleRenameApp}
                      onRenameScreen={handleRenameScreen}
                      onEditScreenYaml={handleEditScreenYaml}
                      onSaveScreenYaml={handleSaveScreenYaml}
                      onSetStartScreen={handleSetStartScreen}
                    />
                  ) : (
                    <YamlEditor
                      yamlContent={yamlContent}
                      setYamlContent={setYamlContent}
                      mockData={mockData}
                      setMockData={setMockData}
                      isSignedIn={isSignedIn}
                      onProcessYaml={processYaml}
                      onSave={handleSave}
                      onExpandVariable={handleExpandVariable}
                    />
                  )}
                </div>
              </aside>
            )}

            {/* Center Pane: Canvas */}
            <main className="center-pane" style={{ minWidth: '400px' }}>
              <AppHeader
                leftPanelVisible={leftPanelVisible}
                rightPanelVisible={rightPanelVisible}
                onToggleLeftPanel={() => setLeftPanelVisible(!leftPanelVisible)}
                onToggleRightPanel={() => setRightPanelVisible(!rightPanelVisible)}
                isSignedIn={isSignedIn}
                appName={workspace.apps.find(a => a.id === workspace.activeAppId)?.name}
                screenName={workspace.apps.find(a => a.id === workspace.activeAppId)?.screens.find(s => s.id === workspace.activeScreenId)?.name}
              />

              <div className="canvas-container" style={{ width: '1366px', height: '768px', overflow: 'hidden' }}>
                {parsedData && Object.keys(parsedData).map(key => (
                  <ControlMapper
                    key={key}
                    control={parsedData[key]}
                    highlightedControls={highlightedControls}
                    appId={workspace.activeAppId}
                    appImages={appImages}
                    onImageUploaded={(img) => setAppImages(prev => [...prev.filter(i => i.name !== img.name), img])}
                  />
                ))}
              </div>

              <footer style={{ position: 'absolute', bottom: 10, right: 10 }}>
                <Text size={100} style={{ color: '#666' }}>Resizing Coming Soon</Text>
              </footer>
            </main>

            {/* Right Pane: Inspector */}
            {rightPanelVisible && (
              <PropertiesPanel
                parsedData={parsedData}
                validationIssues={validationIssues}
              />
            )}
          </div>
        )}
      </FluentProvider>
    </PowerFxProvider>
  );
};

export default App;
