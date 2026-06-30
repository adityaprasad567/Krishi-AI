import { motion } from "framer-motion";
import { useMemo } from "react";

type Leaf = { left: string; delay: string; duration: string; size: number; rotate: number };

export function FloatingLeaves({ count = 14 }: { count?: number }) {
  const leaves = useMemo<Leaf[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        delay: `${(i % 7) * 0.7}s`,
        duration: `${8 + (i % 5)}s`,
        size: 14 + (i % 4) * 6,
        rotate: (i * 47) % 360,
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {leaves.map((l, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          width={l.size}
          height={l.size}
          style={{ left: l.left, top: "-40px", transform: `rotate(${l.rotate}deg)` }}
          className="absolute text-primary/30"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: ["0vh", "110vh"], opacity: [0, 0.8, 0.8, 0] }}
          transition={{
            duration: parseFloat(l.duration),
            delay: parseFloat(l.delay),
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <path
            fill="currentColor"
            d="M12 2C7 6 4 10 4 14a8 8 0 0 0 16 0c0-4-3-8-8-12Zm0 3.5c3.5 3 5.5 6 5.5 8.5a5.5 5.5 0 0 1-11 0c0-2.5 2-5.5 5.5-8.5Z"
          />
        </motion.svg>
      ))}
    </div>
  );
}
