import { useState } from "react";
import { motion } from "framer-motion";

export default function SectionCard({ section, index, children, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="rounded-2xl border-2 p-5 shadow-sm backdrop-blur-sm"
      style={{
        borderColor: `color-mix(in srgb, ${section.color} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${section.color} 6%, var(--color-surface))`,
      }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
            style={{ backgroundColor: `color-mix(in srgb, ${section.color} 16%, transparent)` }}
          >
            {section.icon}
          </span>
          <h3 className="font-heading text-base font-bold" style={{ color: section.color }}>
            {section.title}
          </h3>
        </div>
        <span className="text-ink-soft transition-transform" style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}>
          ▾
        </span>
      </button>

      {!collapsed && <div className="prose-lesson mt-3 text-sm text-ink">{children}</div>}
    </motion.div>
  );
}
