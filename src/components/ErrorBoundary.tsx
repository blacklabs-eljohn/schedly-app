import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Schedly ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    if (window.confirm('Resetting cache will clear temporary state and reload the app. Your account data will re-sync from cloud. Continue?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            backgroundColor: '#090D16',
            color: '#F8FAFC',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Nunito", sans-serif'
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              backgroundColor: '#1E293B',
              borderRadius: 24,
              padding: '28px 24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Something went wrong
            </h1>

            <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Schedly ran into an unexpected display issue. Your schedule data is safe.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                <RefreshCw size={16} /> Reload Schedly
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} /> Reset Local Cache
              </button>
            </div>

            {this.state.error && (
              <details style={{ textAlign: 'left', marginTop: 12 }}>
                <summary style={{ fontSize: 11, color: '#64748B', cursor: 'pointer' }}>
                  Technical Details
                </summary>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: '#0F172A',
                    color: '#F87171',
                    fontSize: 10.5,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}
                >
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
