import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    console.error('Uncaught render error in app:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg text-white p-6">
          <div className="max-w-xl w-full bg-red-900/80 border border-red-700 rounded-2xl p-6 text-center">
            <ShieldAlert className="mx-auto mb-4" />
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-sm mt-2 mb-4">An unexpected error occurred while rendering the page.</p>
            <details className="text-xs text-left bg-black/10 p-3 rounded text-amber-100">
              <summary className="cursor-pointer font-semibold">Error details</summary>
              <pre className="whitespace-pre-wrap mt-2 text-xs">{String(this.state.error)}</pre>
              {this.state.info && <pre className="whitespace-pre-wrap text-xs mt-2">{String(this.state.info.componentStack)}</pre>}
            </details>
            <div className="mt-4">
              <Link to="/" className="btn-primary">Back to Dashboard</Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
