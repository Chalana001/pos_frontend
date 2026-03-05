import { Toaster } from 'react-hot-toast'; // 1. Meka import karanna
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster 
        position="top-right" 
        reverseOrder={false} 
        toastOptions={{
          style: {
            zIndex: 9999,
          },
        }}
      />
    </>
  );
}