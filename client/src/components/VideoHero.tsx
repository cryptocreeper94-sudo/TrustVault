import { useState, useRef, useEffect, type ReactNode } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

import heroVideo1 from "../assets/videos/hero-flyover-1.mp4";
import heroVideo2 from "../assets/videos/hero-flyover-2.mp4";
import heroVideo3 from "../assets/videos/hero-flyover-3.mp4";
import heroVideo4 from "../assets/videos/hero-flyover-4.mp4";
import heroVideo5 from "../assets/videos/hero-flyover-5.mp4";
import heroVideo6 from "../assets/videos/hero-flyover-6.mp4";

const HERO_VIDEOS = [
  { src: heroVideo1, label: "Digital Vault" },
  { src: heroVideo2, label: "City Skyline" },
  { src: heroVideo3, label: "Ocean Coast" },
  { src: heroVideo4, label: "Digital Space" },
  { src: heroVideo5, label: "Mountain Ridge" },
  { src: heroVideo6, label: "Forest Canopy" },
];

interface VideoHeroProps {
  children: ReactNode;
}

export function VideoHero({ children }: VideoHeroProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [nextVideoIndex, setNextVideoIndex] = useState(1);
  const [isVideoTransitioning, setIsVideoTransitioning] = useState(false);
  const videoMuted = true;
  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const handleVideoEnd = () => {
      setIsVideoTransitioning(true);
      setTimeout(() => {
        setCurrentVideoIndex(nextVideoIndex);
        setNextVideoIndex((nextVideoIndex + 1) % HERO_VIDEOS.length);
        setIsVideoTransitioning(false);
      }, 400);
    };
    const video = currentVideoRef.current;
    if (video) {
      video.addEventListener("ended", handleVideoEnd);
      return () => video.removeEventListener("ended", handleVideoEnd);
    }
  }, [nextVideoIndex]);

  useEffect(() => {
    if (nextVideoRef.current) {
      nextVideoRef.current.load();
    }
  }, [nextVideoIndex]);

  useEffect(() => {
    if (currentVideoRef.current && !isVideoTransitioning) {
      const video = currentVideoRef.current;
      video.volume = 0;
      video.play().catch(() => {});
    }
  }, [currentVideoIndex, isVideoTransitioning]);

  const handleDotClick = (idx: number) => {
    if (idx !== currentVideoIndex) {
      setNextVideoIndex(idx);
      setIsVideoTransitioning(true);
      setTimeout(() => {
        setCurrentVideoIndex(idx);
        setNextVideoIndex((idx + 1) % HERO_VIDEOS.length);
        setIsVideoTransitioning(false);
      }, 700);
    }
  };

  return (
    <section
      ref={heroRef}
      className="relative h-[50vh] sm:h-[55vh] lg:h-[60vh] overflow-hidden"
      data-testid="video-hero"
    >
      <div className="absolute inset-0 bg-black">
        <video
          ref={currentVideoRef}
          key={`current-${currentVideoIndex}`}
          autoPlay
          muted={videoMuted}
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            isVideoTransitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          <source src={HERO_VIDEOS[currentVideoIndex].src} type="video/mp4" />
        </video>

        <video
          ref={nextVideoRef}
          key={`next-${nextVideoIndex}`}
          muted={videoMuted}
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            isVideoTransitioning ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={HERO_VIDEOS[nextVideoIndex].src} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#070b16]" />
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {HERO_VIDEOS.map((v, idx) => (
          <button
            key={idx}
            onClick={() => handleDotClick(idx)}
            className={
              currentVideoIndex === idx
                ? "w-8 h-2 bg-white rounded-full transition-all duration-300"
                : "w-2 h-2 bg-white/40 rounded-full hover:bg-white/60 transition-all duration-300"
            }
            data-testid={`dot-hero-${idx}`}
            aria-label={`Go to ${v.label}`}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center"
        style={{ opacity: heroOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </section>
  );
}
