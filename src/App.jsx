import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useDocumentTitle } from "./hooks/useDocumentTitle";

// Must render inside BrowserRouter - useLocation has no router context above it.
function RouteTitle() {
  useDocumentTitle();
  return null;
}

export default function App() {
  useEffect(() => {
    const preventNumberInputWheel = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      if (target.type === "number" && document.activeElement === target) {
        event.preventDefault();
      }
    };

    document.addEventListener("wheel", preventNumberInputWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener("wheel", preventNumberInputWheel, {
        capture: true,
      });
    };
  }, []);

  return (
    <BrowserRouter>
      <RouteTitle />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
      <Toaster 
        position="top-right" 
        reverseOrder={false} 
        toastOptions={{
          // Painted through the ramp so toasts follow the theme live: in light
          // these resolve to the library's own white-card look, in dark to a
          // surface card with near-white text instead of a glaring white one.
          className: "app-toast",
          style: {
            zIndex: 9999,
            background: "rgb(var(--c-surface))",
            color: "rgb(var(--c-slate-900))",
          },
          success: {
            iconTheme: {
              primary: "rgb(var(--toast-icon))",
              secondary: "rgb(var(--toast-icon-check))",
            },
          },
        }}
      />
    </BrowserRouter>
  );
}
