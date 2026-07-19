import { motion } from "framer-motion";
import SearchBar from "./SearchBar.jsx";

export default function Hero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-violet via-brand-pink to-brand-orange px-6 py-12 text-center shadow-lg sm:px-10">
      <div className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 -bottom-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative font-heading text-3xl font-extrabold text-white sm:text-4xl"
      >
        Learn anything. Remember everything.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative mx-auto mt-2 max-w-lg text-sm text-white/90 sm:text-base"
      >
        Type any word or concept you don't understand — get a structured, memorable explanation built to stick.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="relative mt-6"
      >
        <SearchBar autoFocus />
      </motion.div>
    </div>
  );
}
