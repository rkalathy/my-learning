import { motion } from "framer-motion";

const COLORS = ["#8b5cf6", "#ec4899", "#f97316", "#10b981", "#06b6d4", "#eab308"];

export default function ConfettiBurst() {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 200 + Math.random() * 200;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: "50vw", y: "40vh", scale: 1 }}
            animate={{
              opacity: 0,
              x: `calc(50vw + ${Math.cos(angle) * distance}px)`,
              y: `calc(40vh + ${Math.sin(angle) * distance}px)`,
              scale: 0.4,
              rotate: Math.random() * 360,
            }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
        );
      })}
    </div>
  );
}
