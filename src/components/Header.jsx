import { NavLink } from "react-router-dom";

const NAV = [{ to: "/", label: "Home" }];

export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
        <NavLink to="/" className="font-heading text-lg font-extrabold text-ink">
          My Learning{" "}
          <span className="bg-gradient-to-r from-brand-violet via-brand-pink to-brand-orange bg-clip-text text-transparent">
            ✦
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  isActive ? "bg-brand-pink/12 text-brand-pink" : "text-ink-soft hover:text-ink"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          className="rounded-full border border-line p-2 text-sm transition hover:border-ink-soft"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
