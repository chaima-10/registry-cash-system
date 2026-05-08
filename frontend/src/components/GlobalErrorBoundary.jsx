import React, { Component } from 'react';

class GlobalErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    componentDidMount() {
        // Capture console errors
        this.originalConsoleError = console.error;
        console.error = (...args) => {
            this.setState(prev => ({
                consoleErrors: [...(prev.consoleErrors || []), args.map(a => String(a)).join(' ')]
            }));
            this.originalConsoleError.apply(console, args);
        };
    }

    componentWillUnmount() {
        if (this.originalConsoleError) {
            console.error = this.originalConsoleError;
        }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("GLOBAL CRASH:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    minHeight: '100vh',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#f43f5e' }}>Something went wrong.</h1>
                    <p style={{ marginTop: '20px', fontSize: '1.1rem' }}>The application has crashed. Please see the details below:</p>
                    
                    <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        overflowX: 'auto',
                        maxHeight: '400px'
                    }}>
                        <code style={{ color: '#fb7185', fontWeight: 'bold' }}>
                            {this.state.error?.toString()}
                        </code>
                        <pre style={{ marginTop: '20px', color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                            {this.state.errorInfo?.componentStack}
                        </pre>
                        {this.state.consoleErrors?.length > 0 && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                                <p style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 'bold' }}>Console Errors:</p>
                                {this.state.consoleErrors.map((err, idx) => (
                                    <pre key={idx} style={{ color: '#fcd34d', fontSize: '0.75rem', marginTop: '10px' }}>{err}</pre>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => window.location.href = '/'}
                        style={{
                            marginTop: '40px',
                            padding: '12px 24px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Return to Dashboard
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
