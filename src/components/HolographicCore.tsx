"use client";

import { useEffect, useRef } from "react";

export type HoloMode = "idle" | "listening" | "analyzing" | "speaking" | "alert" | "error";

interface Props {
  mode?: HoloMode;
  audioLevel?: number;
}

export default function HolographicCore({ mode = "idle", audioLevel = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationId = 0;
    let time = 0;

    const particles = Array.from({ length: 90 }, (_, index) => ({
      angle: (index / 90) * Math.PI * 2,
      radius: 90 + (index % 17) * 18,
      depth: 0.4 + (index % 7) / 10,
      phase: index * 0.37,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const normalizedAudio = Math.min(1, Math.max(0, audioLevel / 100));

    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.16;

      context.clearRect(0, 0, width, height);

      const background = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
      background.addColorStop(0, "rgba(36, 122, 137, 0.16)");
      background.addColorStop(0.4, "rgba(166, 120, 39, 0.08)");
      background.addColorStop(1, "rgba(5, 6, 8, 0)");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      for (let level = 4; level > 0; level -= 1) {
        const waveRadius = radius * (1 + level * 0.52) + (reducedMotion ? 0 : Math.sin(time * 2 + level) * 8) + normalizedAudio * level * 32;
        const wave = context.createRadialGradient(cx, cy, waveRadius * 0.2, cx, cy, waveRadius);
        wave.addColorStop(0, (mode === "error" ? "rgba(240, 116, 103, 0.18)" : "rgba(61, 226, 239, 0.18)"));
        wave.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.strokeStyle = mode === "listening" ? "rgba(61, 226, 239, 0.35)" : "rgba(214, 173, 87, 0.3)";
        context.lineWidth = reducedMotion ? 1 : 1.3;
        context.beginPath();
        context.arc(cx, cy, waveRadius, 0, Math.PI * 2);
        context.stroke();
      }

      for (let index = 0; index < 10; index += 1) {
        const waveRadius = radius * (1 + index * 0.34) + (reducedMotion ? 0 : Math.sin(time + index * 0.7) * 6) + normalizedAudio * index * 24;
        const color = mode === "error" ? "#f07467" : index % 2 === 0 ? "#3de2ef" : "#d6ad57";
        context.strokeStyle = (mode === "idle" ? "rgba(153, 165, 173, 0.18)" : color + "33");
        context.lineWidth = 0.8;
        context.beginPath();
        context.arc(cx, cy, waveRadius, 0, Math.PI * 2);
        context.stroke();
      }

      // Particles.
      for (const particle of particles) {
        const movement = reducedMotion ? 0 : time * 0.8;
        const x = cx + Math.cos(particle.angle + movement * particle.depth) * particle.radius * particle.depth;
        const y = cy + Math.sin(particle.angle + movement * particle.depth) * particle.radius * particle.depth;
        const waveBoost = normalizedAudio * 35;
        const px = x + Math.cos(particle.phase + time) * waveBoost * (mode === "listening" ? 1 : 0.45);
        const py = y + Math.sin(particle.phase + time) * waveBoost * (mode === "listening" ? 1 : 0.45);
        context.fillStyle =
          mode === "error" ? "rgba(240, 116, 103, 0.7)" : particle.depth > 0.7 ? "rgba(61, 226, 239, 0.75)" : "rgba(214, 173, 87, 0.65)";
        context.beginPath();
        context.arc(px, py, 1 + particle.depth * (mode === "analyzing" ? 2.2 : 1.8), 0, Math.PI * 2);
        context.fill();
      }

      // Central core.
      const coreRadius = radius * (1 + (mode === "analyzing" ? Math.sin(time * 8) * 0.14 + 1.2 : 1));
      const coreGradient = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGradient.addColorStop(0, mode === "error" ? "#f07467" : "#f3f0e9");
      coreGradient.addColorStop(0.35, mode === "error" ? "#d6ad57" : "#3de2ef");
      coreGradient.addColorStop(0.75, mode === "error" ? "rgba(240, 116, 103, 0.12)" : "rgba(255, 100, 70, 0.12)");
      coreGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = coreGradient;
      context.beginPath();
      context.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      context.fill();

      if (!reducedMotion) {
        time += mode === "analyzing" ? 0.04 : 0.016 + normalizedAudio * 0.05;
      }
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [mode, audioLevel]);

  return (
    <div className="holographic-core" aria-hidden="false">
      <canvas ref={canvasRef} className="holo-canvas" role="img" aria-label={`Núcleo holográfico OMEKH en estado ${mode}`} />
      <span className="holo-label">OMEKH CORE · {mode.toUpperCase()}</span>
    </div>
  );
}