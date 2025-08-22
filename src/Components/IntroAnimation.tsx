import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const center = container.querySelector<HTMLDivElement>(".center");
    const textSpans = container.querySelectorAll<HTMLSpanElement>(".text span");
    const lineH = container.querySelector<HTMLDivElement>(".line.h");
    const ripple = container.querySelector<HTMLDivElement>(".ripple");
    const particles = container.querySelectorAll<HTMLDivElement>(".particle");

    if (!center || !lineH || !ripple) return;

    const tl = gsap.timeline({
      onComplete,
      defaults: { ease: "power3.inOut" },
    });

    tl.to(ripple, { scale: 5.5, opacity: 0, duration: 1.6 })
      .to(
        center,
        {
          scale: 2.2,
          duration: 0.4,
          yoyo: true,
          repeat: 1,
          ease: "power1.inOut",
        },
        "-=1.2"
      )
      .to(lineH, { scaleX: 2.45, duration: 0.6, ease: "power2.out" }, "-=1.2")
      .to(
        textSpans,
        {
          opacity: 1,
          scale: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.5,
          ease: "back.out(1.7)",
        },
        "-=0.5"
      );

    if (particles.length > 0) {
      tl.to(
        particles,
        {
          opacity: 1,
          x: () => (Math.random() - 0.5) * 350,
          y: () => (Math.random() - 0.5) * 350,
          scale: 0.9,
          duration: 1,
          stagger: 0.05,
          ease: "power3.out",
        },
        "-=0.4"
      ).to(particles, { opacity: 0, duration: 1 }, "-=0.3");
    }

    tl.to(container, {
      y: "-20%",
      opacity: 0,
      duration: 1.5,
      ease: "power2.inOut",
    });

    // ✅ Correct cleanup: return a function that kills the timeline
    return () => {
      tl.kill();
    };
  }, [onComplete]);
  return (
    <div ref={containerRef} className="intro-container">
      <div className="center"></div>
      <div className="text">
        {"FINVOICE".split("").map((letter, i) => (
          <span key={i}>{letter}</span>
        ))}
      </div>
      <img src="LOGO.png" alt="logo" />
      <div className="line h"></div>
      <div className="ripple"></div>
      {/* {[...Array(8)].map((_, i) => (
        <div key={i} className="particle"></div>
      ))} */}
    </div>
  );
};

export default IntroAnimation;
