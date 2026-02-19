import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  shape: "circle" | "square" | "star";
}

const COLORS = [
  "#a78bfa", "#7c3aed", "#c084fc", "#e879f9",
  "#f472b6", "#fb7185", "#38bdf8", "#34d399",
  "#fbbf24", "#f97316", "#818cf8", "#2dd4bf",
];

const SHAPES: Particle["shape"][] = ["circle", "square", "star"];

function createParticles(count: number, originX: number, originY: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: originX,
    y: originY,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
    velocityX: (Math.random() - 0.5) * 600,
    velocityY: -(Math.random() * 400 + 200),
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  }));
}

function ParticleElement({ particle }: { particle: Particle }) {
  return (
    <motion.div
      initial={{
        x: particle.x,
        y: particle.y,
        opacity: 1,
        scale: 1,
        rotate: 0,
      }}
      animate={{
        x: particle.x + particle.velocityX,
        y: particle.y + particle.velocityY + 600,
        opacity: 0,
        scale: 0.2,
        rotate: particle.rotation + Math.random() * 720,
      }}
      transition={{
        duration: 1.8 + Math.random() * 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="fixed pointer-events-none z-[9999]"
      style={{ willChange: "transform, opacity" }}
    >
      {particle.shape === "circle" && (
        <div
          className="rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
          }}
        />
      )}
      {particle.shape === "square" && (
        <div
          className="rounded-sm"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
          }}
        />
      )}
      {particle.shape === "star" && (
        <svg
          width={particle.size * 1.5}
          height={particle.size * 1.5}
          viewBox="0 0 24 24"
          fill={particle.color}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
    </motion.div>
  );
}

interface ConfettiState {
  particles: Particle[];
  isActive: boolean;
}

interface ConfettiContextValue {
  fire: (options?: { x?: number; y?: number; count?: number }) => void;
  fireCelebration: () => void;
}

const ConfettiContext = createContext<ConfettiContextValue>({
  fire: () => {},
  fireCelebration: () => {},
});

export function useConfetti() {
  return useContext(ConfettiContext);
}

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfettiState>({
    particles: [],
    isActive: false,
  });

  const fire = useCallback((options?: { x?: number; y?: number; count?: number }) => {
    const x = options?.x ?? window.innerWidth / 2;
    const y = options?.y ?? window.innerHeight / 3;
    const count = options?.count ?? 60;

    const particles = createParticles(count, x, y);
    setState({ particles, isActive: true });

    setTimeout(() => {
      setState({ particles: [], isActive: false });
    }, 3000);
  }, []);

  const fireCelebration = useCallback(() => {
    const bursts = [
      { x: window.innerWidth * 0.25, y: window.innerHeight * 0.3, count: 40, delay: 0 },
      { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2, count: 50, delay: 150 },
      { x: window.innerWidth * 0.75, y: window.innerHeight * 0.3, count: 40, delay: 300 },
    ];

    bursts.forEach(({ x, y, count, delay }) => {
      setTimeout(() => {
        setState(prev => ({
          particles: [...prev.particles, ...createParticles(count, x, y)],
          isActive: true,
        }));
      }, delay);
    });

    setTimeout(() => {
      setState({ particles: [], isActive: false });
    }, 4000);
  }, []);

  return (
    <ConfettiContext.Provider value={{ fire, fireCelebration }}>
      {children}
      <AnimatePresence>
        {state.isActive && state.particles.map((p) => (
          <ParticleElement key={`${p.id}-${p.x}-${p.velocityX}`} particle={p} />
        ))}
      </AnimatePresence>
    </ConfettiContext.Provider>
  );
}
