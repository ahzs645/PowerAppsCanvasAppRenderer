import React from 'react';
import { FluentProvider, webLightTheme, Switch } from '@fluentui/react-components';
import { PowerFxProvider } from './context/PowerFxContext';
import { InspectContext } from './context/InspectContext';
import ControlMapper from './components/ControlMapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { parsePowerYAML, extractOnStart, loadAppFromFiles, type LoadedApp } from './utils/parser';
import { parseConnectionsConfig, type ConnectionsConfig } from './utils/connections';
import defaultYaml from './default.yaml?raw';
import defaultConnections from './default-connections.json';

interface AppState extends LoadedApp { title: string; }

const CONN_RE = /(^|\/)connections\.json$/i; // a fake-connections config dropped with the app
const DEFAULT_CONN_TEXT = JSON.stringify(defaultConnections, null, 2);

interface Size { w: number; h: number; }
const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
    { label: 'Tablet 16:9 — 1366×768', w: 1366, h: 768 },
    { label: 'Tablet 3:2 — 1366×910', w: 1366, h: 910 },
    { label: 'Tablet 4:3 — 1024×768', w: 1024, h: 768 },
    { label: 'Web — 1920×1080', w: 1920, h: 1080 },
    { label: 'Phone — 640×1136', w: 640, h: 1136 },
    { label: 'Phone small — 360×640', w: 360, h: 640 },
];
const ZOOM_OPTIONS: { label: string; value: 'fit' | number }[] = [
    { label: 'Fit', value: 'fit' },
    { label: '100%', value: 1 },
    { label: '75%', value: 0.75 },
    { label: '50%', value: 0.5 },
    { label: '33%', value: 0.33 },
];
const inputStyle: React.CSSProperties = { background: '#1c2030', color: '#e8eaed', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 6px', fontSize: 12 };

const PA_RE = /\.pa\.yaml$/i;

// Recursively collect *.pa.yaml + connections.json files from a drag-drop DataTransfer.
async function filesFromDataTransfer(dt: DataTransfer): Promise<{ name: string; text: string }[]> {
    const out: File[] = [];
    const roots = Array.from(dt.items || [])
        .map(it => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
        .filter(Boolean) as any[];

    const readEntry = (entry: any): Promise<File[]> => new Promise(resolve => {
        if (entry.isFile) entry.file((f: File) => resolve([f]), () => resolve([]));
        else if (entry.isDirectory) {
            const reader = entry.createReader();
            const acc: any[] = [];
            const readBatch = () => reader.readEntries(async (batch: any[]) => {
                if (!batch.length) { const nested = await Promise.all(acc.map(readEntry)); resolve(nested.flat()); }
                else { acc.push(...batch); readBatch(); }
            }, () => resolve([]));
            readBatch();
        } else resolve([]);
    });

    if (roots.length) { const nested = await Promise.all(roots.map(readEntry)); out.push(...nested.flat()); }
    else out.push(...Array.from(dt.files || []));

    const wanted = out.filter(f => (PA_RE.test(f.name) || CONN_RE.test(f.name)) && !f.name.startsWith('_'));
    return Promise.all(wanted.map(async f => ({ name: f.name, text: await f.text() })));
}

const Preview: React.FC = () => {
    const initialApp = React.useMemo<AppState>(() => {
        const screens = parsePowerYAML(defaultYaml) || {};
        const names = Object.keys(screens);
        return { screens, onStart: extractOnStart(defaultYaml), names, startScreen: names[0] || null, fileCount: 1, title: 'pt-plan-board (bundled)' };
    }, []);

    const [app, setApp] = React.useState<AppState>(initialApp);
    const [appKey, setAppKey] = React.useState(0);
    const [activeScreen, setActiveScreen] = React.useState<string>(initialApp.startScreen || '');
    const [inspect, setInspect] = React.useState(false);
    const [selectedControlName, setSelectedControlName] = React.useState<string | null>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Fake connections / data sources (editable JSON; bundled default to start).
    const [connText, setConnText] = React.useState<string>(DEFAULT_CONN_TEXT);
    const [showConn, setShowConn] = React.useState(false);
    const connConfig = React.useMemo<ConnectionsConfig | null>(() => parseConnectionsConfig(connText), [connText]);
    const connStats = React.useMemo(() => ({
        ds: connConfig?.dataSources ? Object.keys(connConfig.dataSources).length : 0,
        cn: connConfig?.connectorResponses ? Object.keys(connConfig.connectorResponses).length : 0,
    }), [connConfig]);

    const [size, setSize] = React.useState<Size>({ w: 1366, h: 768 });
    const [zoom, setZoom] = React.useState<'fit' | number>('fit');
    const [avail, setAvail] = React.useState({ w: 1200, h: 700 });
    const stageRef = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        const measure = () => { const el = stageRef.current; if (el) setAvail({ w: el.clientWidth - 48, h: el.clientHeight - 48 }); };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    const scale = zoom === 'fit' ? Math.min(1, avail.w / size.w, avail.h / size.h) : zoom;
    const presetMatch = SIZE_PRESETS.find(p => p.w === size.w && p.h === size.h);

    const loadFiles = React.useCallback((files: { name: string; text: string }[], title: string) => {
        // A connections.json dropped alongside the app becomes the active fake-connections config.
        const connFile = files.find(f => CONN_RE.test(f.name));
        if (connFile) setConnText(connFile.text);
        const paFiles = files.filter(f => PA_RE.test(f.name));
        if (!paFiles.length) { setLoadError('No .pa.yaml files found in that folder.'); return; }
        const loaded = loadAppFromFiles(paFiles);
        if (!loaded.names.length) { setLoadError('No screens found in those .pa.yaml files.'); return; }
        setLoadError(null);
        setApp({ ...loaded, title });
        setActiveScreen(loaded.startScreen || loaded.names[0]);
        setSelectedControlName(null);
        setAppKey(k => k + 1);
    }, []);

    const onDrop = React.useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        try {
            const files = await filesFromDataTransfer(e.dataTransfer);
            loadFiles(files, 'dropped folder');
        } catch (err: any) { setLoadError(String(err?.message || err)); }
    }, [loadFiles]);

    const onPick = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const list = Array.from(e.target.files || []);
        const wanted = list.filter(f => (PA_RE.test(f.name) || CONN_RE.test(f.name)) && !f.name.startsWith('_'));
        const files = await Promise.all(wanted.map(async f => ({ name: f.name, text: await f.text() })));
        const root = (list[0] as any)?.webkitRelativePath?.split('/')[0];
        loadFiles(files, root || 'selected folder');
        e.target.value = '';
    }, [loadFiles]);

    const active = app.screens?.[activeScreen] ?? (app.names[0] ? app.screens[app.names[0]] : null);

    return (
        <FluentProvider theme={webLightTheme} style={{ height: '100vh', background: '#1f2430' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
                <header style={{ height: 48, flex: '0 0 auto', background: '#11141c', color: '#e8eaed', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <strong style={{ fontSize: 14 }}>Canvas App Renderer</strong>
                    <span style={{ fontSize: 12, color: '#9aa0ab' }}>{app.title}</span>
                    {app.names.length > 1 && (
                        <select
                            value={activeScreen}
                            onChange={e => { setActiveScreen(e.target.value); setSelectedControlName(null); }}
                            style={{ background: '#1c2030', color: '#e8eaed', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
                        >
                            {app.names.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Canvas size preset */}
                        <select
                            value={presetMatch ? presetMatch.label : 'custom'}
                            onChange={e => { const p = SIZE_PRESETS.find(x => x.label === e.target.value); if (p) setSize({ w: p.w, h: p.h }); }}
                            title="Canvas size preset"
                            style={inputStyle}
                        >
                            {SIZE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                            <option value="custom" disabled>Custom…</option>
                        </select>
                        {/* Custom width × height */}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9aa0ab' }}>
                            <input type="number" min={120} max={4096} value={size.w}
                                onChange={e => setSize(s => ({ ...s, w: Math.max(120, Number(e.target.value) || 0) }))}
                                style={{ ...inputStyle, width: 64 }} title="Width (px)" />
                            ×
                            <input type="number" min={120} max={4096} value={size.h}
                                onChange={e => setSize(s => ({ ...s, h: Math.max(120, Number(e.target.value) || 0) }))}
                                style={{ ...inputStyle, width: 64 }} title="Height (px)" />
                        </span>
                        {/* Zoom */}
                        <select
                            value={String(zoom)}
                            onChange={e => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}
                            title="Zoom"
                            style={inputStyle}
                        >
                            {ZOOM_OPTIONS.map(z => <option key={z.label} value={String(z.value)}>{z.label}{z.value === 'fit' ? ` (${Math.round(scale * 100)}%)` : ''}</option>)}
                        </select>
                        <button
                            onClick={() => setShowConn(s => !s)}
                            title="Edit fake connections & data sources"
                            style={{ background: showConn ? '#0f766e' : '#1c2030', color: '#cbd0d8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                        >🔌 {connStats.ds} source{connStats.ds === 1 ? '' : 's'}</button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                        >Open app folder…</button>
                        <Switch
                            checked={inspect}
                            onChange={(_e, d) => { setInspect(d.checked); if (!d.checked) setSelectedControlName(null); }}
                            label={<span style={{ color: '#cbd0d8', fontSize: 12 }}>Editor focus</span>}
                        />
                    </div>
                    <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={onPick} {...({ webkitdirectory: '', directory: '' } as any)} />
                </header>

                {loadError && (
                    <div style={{ background: '#7f1d1d', color: '#fecaca', fontSize: 12, padding: '6px 16px' }}>{loadError}</div>
                )}

                <div
                    ref={stageRef}
                    style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 24, position: 'relative' }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false); }}
                    onDrop={onDrop}
                >
                    <InspectContext.Provider value={inspect}>
                        {/* Outer reserves the scaled footprint; inner renders at true size and is transform-scaled. */}
                        <div style={{ width: size.w * scale, height: size.h * scale, flex: '0 0 auto' }}>
                            <div style={{
                                width: size.w, height: size.h, position: 'relative', overflow: 'hidden',
                                background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                                transform: `scale(${scale})`, transformOrigin: 'top left',
                            }}>
                                <PowerFxProvider key={appKey} onNavigate={s => { if (s && app.screens?.[s]) setActiveScreen(s); }} onNotify={m => console.log('[Notify]', m)} onStart={app.onStart} connections={connConfig}>
                                    <ErrorBoundary resetKey={`${appKey}:${activeScreen}`}>
                                        {active && (
                                            <ControlMapper
                                                control={active}
                                                selectedControlName={selectedControlName}
                                                onSelectControl={setSelectedControlName}
                                            />
                                        )}
                                    </ErrorBoundary>
                                </PowerFxProvider>
                            </div>
                        </div>
                    </InspectContext.Provider>

                    {dragOver && (
                        <div style={{
                            position: 'absolute', inset: 16, border: '2px dashed #2563eb', borderRadius: 12,
                            background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#dbeafe', fontSize: 16, pointerEvents: 'none', zIndex: 10,
                        }}>
                            Drop a Canvas App folder (with <code style={{ margin: '0 6px' }}>*.pa.yaml</code> files) to render it
                        </div>
                    )}

                    {showConn && (
                        <ConnectionsPanel
                            text={connText}
                            valid={connConfig != null}
                            stats={connStats}
                            onClose={() => setShowConn(false)}
                            onApply={t => { setConnText(t); setAppKey(k => k + 1); }}
                            onReset={() => { setConnText(DEFAULT_CONN_TEXT); setAppKey(k => k + 1); }}
                        />
                    )}
                </div>
            </div>
        </FluentProvider>
    );
};

/**
 * Live editor for the fake-connections JSON. Lets you define data sources
 * (SharePoint/SQL/Dataverse-style tables) and canned connector responses, then
 * re-run the app against them without touching a backend.
 */
const ConnectionsPanel: React.FC<{
    text: string;
    valid: boolean;
    stats: { ds: number; cn: number };
    onClose: () => void;
    onApply: (text: string) => void;
    onReset: () => void;
}> = ({ text, valid, stats, onClose, onApply, onReset }) => {
    const [draft, setDraft] = React.useState(text);
    React.useEffect(() => { setDraft(text); }, [text]);
    let draftError: string | null = null;
    try { if (draft.trim()) JSON.parse(draft); } catch (e: any) { draftError = e.message; }
    return (
        <div style={{
            position: 'absolute', top: 16, right: 16, bottom: 16, width: 420, zIndex: 20,
            background: '#11141c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
            boxShadow: '0 12px 48px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', color: '#e8eaed',
        }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>Fake connections</strong>
                <span style={{ fontSize: 11, color: '#9aa0ab' }}>{stats.ds} data source{stats.ds === 1 ? '' : 's'} · {stats.cn} connector override{stats.cn === 1 ? '' : 's'} {valid ? '· active' : '· invalid'}</span>
                <button onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', color: '#9aa0ab', border: 'none', fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '8px 12px', fontSize: 11, color: '#9aa0ab', lineHeight: 1.5 }}>
                <code>dataSources</code> act like SharePoint/SQL/Dataverse tables (Filter/LookUp/Patch/Collect work).
                <code> connectorResponses</code> are canned results. <code>Office365Users</code> &amp; <code>Office365Outlook</code> are built in.
            </div>
            <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                spellCheck={false}
                style={{
                    flex: 1, margin: '0 12px', background: '#0b0e14', color: '#cbd0d8', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, padding: 8, resize: 'none',
                }}
            />
            {draftError && <div style={{ color: '#fca5a5', fontSize: 11, padding: '6px 12px' }}>Invalid JSON: {draftError}</div>}
            <div style={{ padding: 12, display: 'flex', gap: 8 }}>
                <button
                    onClick={() => onApply(draft)}
                    disabled={!!draftError}
                    style={{ background: draftError ? '#374151' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: draftError ? 'not-allowed' : 'pointer' }}
                >Apply &amp; run</button>
                <button
                    onClick={onReset}
                    style={{ background: '#1c2030', color: '#cbd0d8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
                >Reset to sample</button>
            </div>
        </div>
    );
};

export default Preview;
