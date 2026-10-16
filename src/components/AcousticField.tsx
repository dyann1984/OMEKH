"use client";

import { useEffect, useRef } from "react";

interface Props {
  analyserRef: { current: AnalyserNode | null };
  active: boolean;
  mode?: "waves" | "particles" | "combined";
  intensity?: number;
  density?: number;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  depth: number;
  phase: number;
  band: number;
  tail: Array<{ x: number; y: number }>;
}

export default function AcousticField({ analyserRef, active, mode = "combined", intensity = 0.7, density = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particleCount = reducedMotion ? Math.max(24, Math.round(density / 4)) : Math.max(48, Math.round(density));
    const particles: Particle[] = Array.from({ length: particleCount }, (_, index) => ({
      angle: (index / particleCount) * Math.PI * 2,
      radius: 0.22 + ((index * 13) % 60) / 200,
      speed: 0.003 + ((index * 7) % 40) / 1000,
      depth: 0.3 + ((index * 19) % 70) / 100,
      phase: index * 0.53,
      band: index % 3,
      tail: [],
    }));

    let animationId = 0;
    let previousEnergy = 0;
    const frequencyData = new Uint8Array(2048);
    const timeData = new Uint8Array(2048);
    let beatPulse = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, reducedMotion ? 1 : 2);
      const width = parent.clientWidth;
      const height = parent.clientHeight || Math.round(width * 0.62);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * (mode === "particles" ? 0.3 : 0.38);
      const time = (typeof performance !== "undefined" ? performance.now() : 0) / 1000;

      if (!active) {
        context.clearRect(0, 0, width, height);
        animationId = requestAnimationFrame(render);
        return;
      }

      const analyser = analyserRef.current;
      let rms = 0;
      let lowEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;
      let transient = false;

      if (analyser) {
        if (analyser.fftSize < 1024) analyser.fftSize = 1024;
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeData);
        const length = Math.min(timeData.length, analyser.fftSize);
        let sum = 0;
        for (let i = 0; i < length; i += 1) {
          const value = (timeData[i] - 128) / 128;
          sum += value * value;
        }
        rms = Math.sqrt(sum / length);

        const bins = Math.min(frequencyData.length, 512);
        const third = Math.max(1, Math.floor(bins / 3));
        for (let i = 1; i < third; i += 1) lowEnergy += frequencyData[i];
        for (let i = third; i < third * 2; i += 1) midEnergy += frequencyData[i];
        for (let i = third * 2; i < bins; i += 1) highEnergy += frequencyData[i];
        lowEnergy /= (third - 1) * 255;
        midEnergy /= third * 255;
        highEnergy /= ((bins - third * 2) * 255) || 1;

        transient = Math.abs(rms - previousEnergy) > 0.075;
        if (transient) beatPulse = Math.max(beatPulse, 0.85 + rms * 1.2);
        if (beatPulse > 0) beatPulse *= 0.86;
        previousEnergy = previousEnergy * 0.82 + rms * 0.18;
      }

      context.clearRect(0, 0, width, height);

      // Ondas que representan la energía real.
      if (mode !== "particles") {
        for (let i = 0; i < 6; i += 1) {
          const waveRadius = radius * (0.55 + i * 0.18) * (1 + rms * intensity * (0.5 + i * 0.35)) * (1 + beatPulse * 0.08);
          const alpha = 0.22 + (reducedMotion ? 0 : Math.sin(time * 2.5 + i) * 0.06) + rms * 0.55 * intensity;
          context.strokeStyle = i % 3 === 0
            ? `rgba(214, 173, 87, ${alpha})`
            : i % 3 === 1
              ? `rgba(61, 226, 239, ${alpha})`
              : `rgba(240, 240, 240, ${alpha * 0.7})`;
          context.lineWidth = 2.4 + rms * 5.5 * intensity + beatPulse * 4;
          context.beginPath();
          context.arc(cx, cy, waveRadius, 0, Math.PI * 2);
          context.stroke();
        }
      }

      if (mode === "particles" || mode === "combined") {
        for (const particle of particles) {
          const band = particle.band;
          const bandEnergy = band === 0 ? lowEnergy : band === 1 ? midEnergy : highEnergy;
          const speed = reducedMotion ? 0 : 0.0008 + particle.speed * (0.5 + rms * 3);
          particle.angle += speed * (rms > 0.01 ? 1 : 0.1);
          const responseRadius = radius * (0.35 + particle.radius * (1.1 + bandEnergy * 3 * intensity));
          const x = cx + Math.cos(particle.angle + particle.phase) * responseRadius * (0.75 + particle.depth);
          const y = cy + Math.sin(particle.angle + particle.phase) * responseRadius * (0.75 + particle.depth);

          particle.tail.push({ x, y });
          if (particle.tail.length > (reducedMotion ? 3 : 8)) particle.tail.shift();

          for (let i = 0; i < particle.tail.length; i += 1) {
            const alpha = ((i + 1) / particle.tail.length) * (0.32 + bandEnergy * 0.65) * intensity;
            const tail = particle.tail[i];
            context.fillStyle = band === 0
              ? `rgba(214, 173, 87, ${alpha})`
              : band === 1
                ? `rgba(61, 226, 239, ${alpha})`
                : `rgba(243, 240, 233, ${alpha * 0.7})`;
            context.beginPath();
            context.arc(tail.x, tail.y, 2.4 + bandEnergy * intensity * 4, 0, Math.PI * 2);
            context.fill();
          }
        }
      }

      if (!reducedMotion) {
        beatPulse *= 0.94;
      }
      requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [active, analyserRef, intensity, mode, density]);

  return (
    <canvas
      ref={canvasRef}
      className="acoustic-field"
      aria-label={active ? "Campo acústico reactivo activo" : "Campo acústico detenido"}
      role="img"
    />
  );
}
