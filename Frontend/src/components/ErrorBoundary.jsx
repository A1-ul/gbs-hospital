import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * GBS Hospital Management System — Global React Error Boundary
 * Prevents unhandled UI exceptions from blanking the screen, displays a calm
 * user-friendly recovery card, and never leaks raw stack traces to ordinary users.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorRef: null };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
      errorRef: `UI-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  componentDidCatch(error) {
    try {
      if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
        window.gbsBrainNotify({
          type: 'error',
          method: 'UI',
          code: 'UI_RENDER_RECOVERY',
          requestId: this.state.errorRef || '',
          title: 'Display Recovery Activated',
          message: 'An unexpected screen display issue was caught safely. Your hospital records remain protected.',
        });
      }
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error('[GBS UI ErrorBoundary]', error?.name || 'Error');
      }
    } catch (_ignore) {
      // Never allow telemetry failure inside error boundary
    }
  }

  handleReturnHome = () => {
    this.setState({ hasError: false, errorRef: null });
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', '/');
        window.location.assign('/');
      } catch (_e) {
        window.location.reload();
      }
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#091830',
          color: '#f7f5ef',
        }}
      >
        <div
          className="glass-panel"
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            borderRadius: '14px',
            border: '1px solid rgba(194, 155, 79, 0.55)',
            background: 'rgba(9, 24, 48, 0.96)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '10px',
                border: '1.5px solid #c29b4f',
                background: '#091830',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/gbs-official-logo.png"
                alt="GBS Official Company Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '6px' }}
              />
            </div>
            <AlertTriangle size={34} style={{ color: '#e7cf88' }} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#e7cf88', fontWeight: 800 }}>
            We Caught a Screen Display Issue
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: '#e5e7eb' }}>
            Your hospital records, patient data, and session remain completely safe. Choose an option below to continue smoothly.
          </p>
          {this.state.errorRef && (
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#baa479' }}>
              Support Reference: {this.state.errorRef}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
            <button
              type="button"
              onClick={this.handleReturnHome}
              className="btn-gold"
              style={{ padding: '8px 16px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Home size={15} /> Return to Home Screen
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-outline-gold"
              style={{ padding: '8px 16px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} /> Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
