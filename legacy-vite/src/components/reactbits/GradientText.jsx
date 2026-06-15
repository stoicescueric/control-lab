/* GradientText — text with an animated sweeping gradient fill.
   Adapted from React Bits (https://reactbits.dev), MIT licensed.
   The `cl-gradient` keyframes live in styles/global.css. */

export function GradientText({
  children,
  className = "",
  colors = ["#4f6cf7", "#8b5cf6", "#11b5a4", "#4f6cf7"],
  duration = 6,
}) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
        backgroundSize: "200% 100%",
        animation: `cl-gradient ${duration}s linear infinite`,
      }}
    >
      {children}
    </span>
  );
}

export default GradientText;
