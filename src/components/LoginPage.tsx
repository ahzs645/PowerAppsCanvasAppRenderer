import React from 'react';
import { SignInButton } from "@clerk/clerk-react";
import { FluentProvider, webDarkTheme, Button, Text, Card, CardHeader } from '@fluentui/react-components';
import { Shield, Users } from 'lucide-react';

interface LoginPageProps {
  onGuestMode: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onGuestMode }) => {
  return (
    <FluentProvider theme={webDarkTheme}>
      <div className="landing-page">
        <div className="glass-card" style={{ minWidth: '900px', maxWidth: '1000px', width: '90%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
            <Text className="landing-title">Canvas App Renderer</Text>
            <Text className="landing-subtitle">Experience PowerApps YAML like never before. High-fidelity rendering with ultimate control.</Text>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            justifyContent: 'center', 
            alignItems: 'stretch', 
            width: '100%',
            maxWidth: '800px', 
            margin: '0 auto',
            padding: '0 20px',
            boxSizing: 'border-box'
          }}>
            {/* Free Tier Sign In Card */}
            <Card
              style={{
                flex: '1',
                minWidth: '300px',
                background: 'linear-gradient(135deg, rgba(0, 120, 212, 0.1) 0%, rgba(0, 120, 212, 0.05) 100%)',
                border: '1px solid rgba(0, 120, 212, 0.3)',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardHeader
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Shield size={24} color="#0078d4" />
                    <Text weight="semibold" size={500}>Free Tier with Account</Text>
                  </div>
                }
              />
              
              <div style={{ marginBottom: '20px', flex: '1' }}>
                <Text size={300} style={{ color: '#e1e1e1', marginBottom: '12px', display: 'block' }}>
                  Full-featured development environment
                </Text>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#94a3b8', fontSize: '14px' }}>
                  <li>Multi-App support (up to 3 apps)</li>
                  <li>Multi-Screen support (4 per app)</li>
                  <li>Cloud sync & persistence</li>
                  <li>Advanced debugging tools</li>
                </ul>
              </div>

              <SignInButton mode="modal">
                <Button appearance="primary" style={{ width: '100%', height: '40px' }}>
                  Sign In (Free)
                </Button>
              </SignInButton>
            </Card>

            {/* Guest Mode Card */}
            <Card
              style={{
                flex: '1',
                minWidth: '300px',
                background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(100, 116, 139, 0.05) 100%)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={onGuestMode}
            >
              <CardHeader
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Users size={24} color="#64748b" />
                    <Text weight="semibold" size={500}>Guest Mode</Text>
                  </div>
                }
              />
              
              <div style={{ marginBottom: '20px', flex: '1' }}>
                <Text size={300} style={{ color: '#e1e1e1', marginBottom: '12px', display: 'block' }}>
                  Try the editor with basic features
                </Text>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#94a3b8', fontSize: '14px' }}>
                  <li>Single YAML editor</li>
                  <li>Local browser storage</li>
                  <li>Basic rendering & validation</li>
                  <li>No account required</li>
                </ul>
              </div>

              <Button appearance="subtle" style={{ width: '100%', height: '40px', border: '1px solid rgba(100, 116, 139, 0.4)' }}>
                Continue as Guest
              </Button>
            </Card>
          </div>

          <Text size={100} style={{ color: '#475569', marginTop: '32px', textAlign: 'center' }}>v1.0.0 • Secured by Clerk</Text>
        </div>
      </div>
    </FluentProvider>
  );
};

export default LoginPage;
