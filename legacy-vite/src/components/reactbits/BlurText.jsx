/* BlurText — animated text that fades + un-blurs in, word by word.
   Adapted from React Bits (https://reactbits.dev), MIT licensed.
   Tailwind variant; powered by framer-motion. */

import { motion } from "framer-motion";

export function BlurText({
  text = "",
  delay = 80, // ms between words
  className = "",
  animateBy = "words", // "words" | "letters"
  direction = "up",
}) {
  const segments = animateBy === "words" ? text.split(" ") : Array.from(text);
  const y = direction === "up" ? 16 : -16;

  return (
    <span className={className}>
      {segments.map((seg, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre [will-change:transform,filter,opacity]"
          initial={{ opacity: 0, filter: "blur(10px)", y }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.5, delay: (i * delay) / 1000, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {seg}
          {animateBy === "words" && i < segments.length - 1 ? " " : null}
        </motion.span>
      ))}
    </span>
  );
}

export default BlurText;
