import React from 'react';
import { SignInButton } from "@clerk/clerk-react";
import { FluentProvider, webDarkTheme, Button, Text } from '@fluentui/react-components';
import { Shield, Users } from 'lucide-react';

interface LoginPageProps {
  onGuestMode: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onGuestMode }) => {
  return (
    <FluentProvider theme={webDarkTheme}>
      <div className="landing-page">
        <div className="glass-card" style={{ maxWidth: '1000px', width: '95%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
            <Text className="landing-title">Canvas App Renderer</Text>
            <Text className="landing-subtitle">Experience PowerApps YAML like never before. High-fidelity rendering with ultimate control.</Text>
          </div>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px', 
            width: '100%',
            maxWidth: '900px'
          }}>
            {/* Free Tier Sign In Card */}
            <div className="premium-card active">
              <div className="icon-wrapper blue">
                <Shield size={28} />
              </div>
              
              <Text weight="semibold" size={600} style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                Free Tier
              </Text>
              
              <Text size={300} style={{ color: '#94a3b8', marginBottom: '24px', display: 'block' }}>
                Full-featured development environment with account synchronization.
              </Text>

              <div style={{ marginBottom: '32px' }}>
                {[
                  'Multi-App support (up to 3 apps)',
                  'Multi-Screen support (4 per app)',
                  'Cloud sync & persistence',
                  'Advanced debugging tools'
                ].map((text, i) => (
                  <div key={i} className="list-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <SignInButton mode="modal">
                <Button 
                  appearance="primary" 
                  size="large"
                  style={{ 
                    width: '100%', 
                    height: '48px', 
                    fontSize: '16px', 
                    boxShadow: '0 10px 15px -3px rgba(0, 120, 212, 0.3)' 
                  }}
                >
                  Sign In (Free)
                </Button>
              </SignInButton>
            </div>

            {/* Guest Mode Card */}
            <div className="premium-card" onClick={onGuestMode} style={{ cursor: 'pointer' }}>
              <div className="icon-wrapper slate">
                <Users size={28} />
              </div>
              
              <Text weight="semibold" size={600} style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                Guest Mode
              </Text>
              
              <Text size={300} style={{ color: '#94a3b8', marginBottom: '24px', display: 'block' }}>
                Explore the renderer features instantly without an account.
              </Text>

              <div style={{ marginBottom: '32px' }}>
                {[
                  'Single YAML editor',
                  'Local browser storage',
                  'Basic rendering & validation',
                  'No account required'
                ].map((text, i) => (
                  <div key={i} className="list-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <Button 
                appearance="subtle" 
                size="large"
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  fontSize: '16px',
                  background: 'rgba(148, 163, 184, 0.1)',
                  border: '1px solid rgba(148, 163, 184, 0.2)'
                }}
              >
                Continue as Guest
              </Button>
            </div>
          </div>

          <Text size={100} style={{ color: '#475569', marginTop: '48px' }}>v1.0.0 • Secured by Clerk</Text>
        </div>
      </div>
    </FluentProvider>
  );
};

export default LoginPage;
