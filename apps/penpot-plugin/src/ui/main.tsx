import { createRoot } from "react-dom/client";
import { App } from "./App.js";

document.documentElement.style.background = "#f4f7f6";
document.body.style.margin = "0";
document.body.style.background = "#f4f7f6";
document.body.style.color = "#1c2422";

const el = document.getElementById("root");
if (el) createRoot(el).render(<App />);
