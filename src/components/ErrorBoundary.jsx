import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-lg text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Application Notice</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
              An unexpected display issue occurred in this section. Your ticket data in the database remains completely safe.
            </p>
          </div>
          {this.state.error && (
            <div className="p-3 bg-slate-100 rounded-xl text-left text-xs font-mono text-slate-700 overflow-x-auto max-h-32 border border-slate-200">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset View & Return to Home</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
