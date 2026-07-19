import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import HomePage from "./pages/HomePage.jsx";
import LessonPage from "./pages/LessonPage.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";
import { initTheme, toggleTheme } from "./lib/theme.js";

export default function App() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(initTheme());
  }, []);

  return (
    <div className="min-h-svh bg-bg">
      <Header theme={theme} onToggleTheme={() => setTheme(toggleTheme(theme))} />
      <main className="mx-auto max-w-4xl px-5 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lesson/:topicSlug" element={<LessonPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-4xl px-5 py-8 text-center text-xs text-ink-soft">
        No conversation history is sent per lesson — each topic is generated independently to keep API costs minimal.
      </footer>
    </div>
  );
}
