
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

    const center = container.querySelector(".center");
    const textSpans = container.querySelectorAll(".text span");
    const lineH = container.querySelector(".line.h");
    const ripple = container.querySelector(".ripple");
    const particles = container.querySelectorAll(".particle");

    const tl = gsap.timeline({
      onComplete,
      defaults: { ease: "power3.inOut" }
    });

    tl.to(ripple, {
      scale: 5.5,
      opacity: 0,
      duration: 1.6
    })
    .to(
      center,
      {
        scale: 2.2,
        duration: 0.4,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut"
      },
      "-=1.2"
    )
    
      // Horizontal line slight stretch
      .to(
        lineH,
        {
          scaleX: 2.45, // 5% larger than the center circle
          duration: 0.6,
          ease: "power2.out"
        },
        "-=1.2"
      )
      .to(
        textSpans,
        {
          opacity: 1,
          scale: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.5,
          ease: "back.out(1.7)"
        },
        "-=0.5"
      )
      .to(
        particles,
        {
          opacity: 1,
          x: () => (Math.random() - 0.5) * 350,
          y: () => (Math.random() - 0.5) * 350,
          scale: 0.9,
          duration: 1,
          stagger: 0.05,
          ease: "power3.out"
        },
        "-=0.4"
      )
      .to(particles, { opacity: 0, duration: 0.6 }, "-=0.3")
      // Slide away
      .to(container, { y: "-100%", duration: 1, ease: "power2.inOut" });

    return () => {
      tl.kill(); // cleanup on unmount
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
    </div>
  );
};

export default IntroAnimation;
