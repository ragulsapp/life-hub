import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);

  return (
    <span>
      {prefix}
      {Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}
