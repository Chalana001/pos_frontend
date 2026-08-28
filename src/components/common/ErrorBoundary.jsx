import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

/**
 * Catches render errors so one bad component cannot blank the whole till.
 *
 * React unmounts the entire tree on an uncaught render error. Without a boundary
 * that means a white screen mid-sale. Two variants:
 *
 *   variant="screen"  — wraps the router; keeps the browser on a real page and
 *                       offers a reload.
 *   variant="section" — wraps one panel (the cart, a report); the rest of the
 *                       screen keeps working and only the panel is replaced.
 *
 * Queued offline sales live in IndexedDB and survive both paths. The in-memory
 * cart does not survive a reload, so the copy says so rather than implying the
 * sale is safe.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled render error', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    const { children, variant = 'screen', title, description } = this.props;

    if (!error) return children;

    const isSection = variant === 'section';

    const heading = title || (isSection ? 'This panel stopped responding' : 'Something went wrong');
    const body =
      description ||
      (isSection
        ? 'The rest of the screen is still working. Try loading this panel again.'
        : 'Reloading will clear the cart on screen. Sales already queued offline are stored on this machine and are not affected.');

    return (
      <div
        role="alert"
        className={
          isSection
            ? 'flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center'
            : 'flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center'
        }
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={24} aria-hidden="true" />
        </span>

        <div className="space-y-1">
          <h2 className={isSection ? 'text-base font-semibold text-slate-800' : 'text-xl font-semibold text-slate-800'}>
            {heading}
          </h2>
          <p className="max-w-md text-sm text-slate-600">{body}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Try again
          </button>

          {!isSection && (
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Reload screen
            </button>
          )}
        </div>

        {import.meta.env.DEV && (
          <pre className="mt-2 max-w-full overflow-x-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-200">
            {error.stack || String(error)}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
