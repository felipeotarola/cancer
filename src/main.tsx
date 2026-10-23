import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthGate } from './components/AuthGate';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {import.meta.env.VITE_AGENT_MODE === 'mock' ? <App /> : <AuthGate />}
  </StrictMode>,
);
