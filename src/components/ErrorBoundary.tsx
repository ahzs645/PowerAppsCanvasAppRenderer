import React from 'react';

interface Props { children: React.ReactNode; resetKey?: any; }
interface State { error: Error | null; }

/**
 * Catches render errors from the canvas so a single misbehaving control
 * shows an inline message instead of blanking the whole screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State { return { error }; }

    componentDidUpdate(prev: Props) {
        if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 24, color: '#b00020', fontFamily: 'monospace', fontSize: 13, background: '#fff', height: '100%', overflow: 'auto' }}>
                    <strong>Render error:</strong>
                    <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{this.state.error.message}</div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
