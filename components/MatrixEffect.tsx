"use client";

import { useEffect, useState, useRef } from "react";

const MATRIX_CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const FADE_DURATION_MS = 4000;

type Props = {
  text: string;
  onComplete?: () => void;
};

export function MatrixEffect({ text, onComplete }: Props) {
  const [opacity, setOpacity] = useState(1);
  const [showText, setShowText] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cols = Math.floor(canvas.width / 14);
    const drops: number[] = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff41";
      ctx.font = "12px monospace";

      for (let i = 0; i < drops.length; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        ctx.fillText(char, i * 14, drops[i] * 14);
        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    let animId: number;
    const animate = () => {
      draw();
      animId = requestAnimationFrame(animate);
    };
    animate();

    setShowText(true);

    const fadeTimer = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => {
        cancelAnimationFrame(animId);
        onComplete?.();
      }, 800);
    }, FADE_DURATION_MS);

    return () => {
      window.removeEventListener("resize", resize);
      clearTimeout(fadeTimer);
      cancelAnimationFrame(animId);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      style={{ transition: "opacity 0.8s ease-out", opacity }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: "screen" }}
      />
      {showText && (
        <p
          className="relative z-10 text-center text-2xl sm:text-3xl font-mono text-[#00ff41] px-4"
          style={{
            textShadow: "0 0 10px #00ff41, 0 0 20px #00ff41",
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
