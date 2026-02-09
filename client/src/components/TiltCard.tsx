import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltAmount?: number;
  glareEnabled?: boolean;
  onClick?: () => void;
  "data-testid"?: string;
}

export function TiltCard({
  children,
  className = "",
  tiltAmount = 6,
  glareEnabled = true,
  onClick,
  "data-testid": testId,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setTilt({
        x: (y - 0.5) * -tiltAmount,
        y: (x - 0.5) * tiltAmount,
      });

      if (glareEnabled) {
        setGlare({
          x: x * 100,
          y: y * 100,
          opacity: 0.12,
        });
      }
    },
    [tiltAmount, glareEnabled]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  }, []);

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "800px",
      }}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        mass: 0.5,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
      {glareEnabled && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-30"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 60%)`,
            transition: "opacity 0.2s ease",
          }}
        />
      )}
    </motion.div>
  );
}
