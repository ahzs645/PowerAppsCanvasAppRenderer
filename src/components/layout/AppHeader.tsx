import React from 'react';
import {
    Button,
    Text
} from '@fluentui/react-components';
import { SignInButton, UserButton } from "@clerk/clerk-react";
import {
    Layout,
    Maximize2,
    PanelLeft,
    PanelRight
} from 'lucide-react';

interface AppHeaderProps {
    leftPanelVisible: boolean;
    rightPanelVisible: boolean;
    onToggleLeftPanel: () => void;
    onToggleRightPanel: () => void;
    isSignedIn: boolean | undefined;
    appName?: string;
    screenName?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    leftPanelVisible,
    rightPanelVisible,
    onToggleLeftPanel,
    onToggleRightPanel,
    isSignedIn,
    appName,
    screenName
}) => {
    return (
        <header className="pane-header modern-center-header" style={{ width: '100%', position: 'absolute', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Button
                    size="small"
                    className="modern-button"
                    icon={<PanelLeft size={16} />}
                    onClick={onToggleLeftPanel}
                    appearance={leftPanelVisible ? "primary" : "secondary"}
                    title="Toggle Workspace Panel"
                />
                <Layout size={20} style={{ color: '#64748b' }} />
                <Text weight="semibold" style={{
                    color: '#e2e8f0',
                    fontSize: '16px'
                }}>
                    {appName && screenName ? `${appName} > ${screenName}` : "Canvas Viewport"}
                </Text>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Button
                    size="small"
                    className="modern-button"
                    icon={<Maximize2 size={16} />}
                >
                    Fit
                </Button>
                <Button
                    size="small"
                    className="modern-button"
                    icon={<PanelRight size={16} />}
                    onClick={onToggleRightPanel}
                    appearance={rightPanelVisible ? "primary" : "secondary"}
                    title="Toggle Inspector Panel"
                />
                {isSignedIn ? (
                    <div className="slide-in-right">
                        <UserButton afterSignOutUrl="/" />
                    </div>
                ) : (
                    <SignInButton mode="modal">
                        <Button className="modern-button primary" appearance="primary" size="small">Sign In</Button>
                    </SignInButton>
                )}
            </div>
        </header>
    );
};
