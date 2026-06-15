/* AnimatedContent — reveals its children (fade + rise) when scrolled into view.
   Adapted from React Bits (https://reactbits.dev), MIT licensed.
   Powered by framer-motion's whileInView. */

import { motion } from "framer-motion";

export function AnimatedContent({ children, delay = 0, distance = 24, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedContent;
