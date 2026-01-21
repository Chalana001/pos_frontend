import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import { BranchProvider } from "./context/BranchContext.jsx";
import { ShiftProvider } from "./context/ShiftContext.jsx"; // ✅ ADD THIS

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
          <ShiftProvider>
            <App />
          </ShiftProvider>
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
