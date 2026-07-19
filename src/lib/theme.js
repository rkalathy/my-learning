import { getTheme, setTheme as persistTheme } from "./store.js";

export function applyTheme(theme) {
  const isDark = theme === "dark" || (theme === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function initTheme() {
  const stored = getTheme();
  applyTheme(stored);
  return stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

export function toggleTheme(current) {
  const next = current === "dark" ? "light" : "dark";
  persistTheme(next);
  applyTheme(next);
  return next;
}
