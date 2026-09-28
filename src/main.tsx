import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Showcase } from "./components/ui";
import "./styles/suite-tokens.css";
import "./styles/tokens.css";
import "./styles/components.css";

if (
  import.meta.env.DEV &&
  import.meta.env.VITE_DISABLE_REACT_DEVTOOLS !== "1"
) {
  void import("react-grab");
  void import("react-scan");
}
const root = document.getElementById("root");
if (!root) throw new Error("앱을 표시할 위치를 찾을 수 없습니다.");
const showcase = new URLSearchParams(window.location.search).has("showcase");
createRoot(root).render(
  <StrictMode>{showcase ? <Showcase /> : <App />}</StrictMode>,
);
