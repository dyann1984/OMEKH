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
    const amplitude = Math.min(1, Math.max(0, audioLevel / 100));
    const count = reducedMotion ? 72 : 130;
    const points = Array.from({ length: count }, (_, index) => {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const depth = 0.2 + ((index * 17) % 100) / 200;
      return {
        phi,
        theta,
        depth,
        brightness: 0.35 + ((index * 31) % 40) / 100,
        phase: index * 0.37,
      };
    });

    const links: Array<[number, number]> = [];
    for (let i = 0; i < count; i += 3) {
      const target = (i + Math.floor(count / 5)) % count;
      links.push([i, target]);
    }

    let frame = 0;
    let animationId = 0;
    const camera = { yaw: 0, pitch: 0.42 };

    const resize = () => {
      const size = Math.min(420, Math.max(240, canvas.parentElement?.clientWidth || 320));
      canvas.width = size;
      canvas.height = size;
    };
    resize();

    const renderFrame = () => {
      const size = canvas.width;
      const cx = size / 2;
      const cy = size / 2;
      const time = frame * 0.016;

      camera.yaw = reducedMotion ? 0.2 : camera.yaw + (0.0025 + amplitude * 0.005);
      context.clearRect(0, 0, size, size);

      const baseGradient = context.createRadialGradient(cx, cy, size * 0.04, cx, cy, size * 0.78);
      baseGradient.addColorStop(0, "rgba(35, 118, 135, 0.26)");
      baseGradient.addColorStop(0.26, "rgba(25, 47, 76, 0.72)");
      baseGradient.addColorStop(0.7, "rgba(5, 7, 12, 0.92)");
      baseGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = baseGradient;
      context.fillRect(0, 0, size, size);

      context.strokeStyle = "rgba(61, 226, 239, 0.08)";
      context.lineWidth = 1;
      for (let grid = 1; grid <= 4; grid += 1) {
        context.beginPath();
        context.arc(cx, cy, (size * grid) / 10, 0, Math.PI * 2);
        context.stroke();
      }

      const radius = size * 0.34;
      const modeScale =
        mode === "alert" || mode === "error"
          ? 0.96
          : mode === "analyzing"
            ? 1.04
            : mode === "listening"
              ? 1 + amplitude * 0.12
              : 1;
      const projected = points.map((point, index) => {
        const response =
          mode === "listening"
            ? 1 + Math.sin(time * 8 + point.phase) * amplitude * 0.28
            : mode === "analyzing"
              ? 1 + (0.12 + Math.sin(time * 12 + point.phase) * 0.2)
              : mode === "speaking"
                ? 1 + (0.08 + Math.sin(time * 10 + point.phase) * amplitude * 0.2)
                : mode === "error"
                  ? 1 - 0.06 + Math.sin(time * 4 + point.phase) * 0.06
                  : 1 + Math.sin(time * 2 + point.phase) * 0.04;

        const r = radius * modeScale * response * (0.7 + point.depth * 0.8);
        const x = r * Math.sin(point.phi) * Math.cos(point.theta + time * 0.5);
        const y = r * Math.cos(point.phi);
        const z = r * Math.sin(point.phi) * Math.sin(point.theta + time * 0.5);

        const cosY = Math.cos(camera.yaw);
        const sinY = Math.sin(camera.yaw);
        const cosX = Math.cos(camera.pitch);
        const sinX = Math.sin(camera.pitch);
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        const ry = y * cosX - rz * sinX;
        const rz2 = y * sinX + rz * cosX;

        const perspective = size / (size * 1.05 + rz2);
        const px = cx + rx * perspective * 1.35;
        const py = cy + ry * perspective * 1.35;
        const alpha = 0.35 + point.depth * 0.55 + (mode === "analyzing" ? 0.16 : 0);
        const color =
          mode === "error"
            ? `rgba(240, 116, 103, ${alpha})`
            : mode === "alert"
              ? `rgba(243, 163, 111, ${alpha})`
              : index % 4 === 0
                ? `rgba(214, 173, 87, ${alpha})`
                : `rgba(61, 226, 239, ${alpha})`;

        return { px, py, rz2, point, color };
      });

      projected.sort((a, b) => a.rz2 - b.rz2);

      for (const [from, to] of links) {
        const a = projected[from];
        const b = projected[to];
        if (!a || !b) continue;
        context.strokeStyle =
          mode === "error"
            ? "rgba(240, 116, 103, 0.16)"
            : mode === "listening" && amplitude > 0.2
              ? "rgba(61, 226, 239, 0.3)"
              : "rgba(61, 226, 239, 0.13)";
        context.lineWidth = mode === "analyzing" ? 1 : 0.8;
        context.beginPath();
        context.moveTo(a.px, a.py);
        context.lineTo(b.px, b.py);
        context.stroke();
      }

      for (const item of projected) {
        const glow = context.createRadialGradient(item.px, item.py, 0, item.px, item.py, 12);
        glow.addColorStop(0, item.color);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(item.px, item.py, 1 + item.point.depth * 2.2, 0, Math.PI * 2);
        context.fill();
      }

      const coreSize = radius * 0.42 * (mode === "analyzing" ? 1.12 + Math.sin(time * 9) * 0.06 : 1);
      const core = context.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      core.addColorStop(0, mode === "error" ? "rgba(240, 116, 103, 0.95)" : "rgba(246, 240, 233, 0.9)");
      core.addColorStop(0.34, mode === "error" ? "rgba(214, 173, 87, 0.45)" : "rgba(61, 226, 239, 0.62)");
      core.addColorStop(0.72, mode === "error" ? "rgba(240, 116, 103, 0.08)" : "rgba(214, 173, 87, 0.18)");
      core.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = core;
      context.beginPath();
      context.arc(cx, cy, coreSize, 0, Math.PI * 2);
      context.fill();

      if (mode === "listening") {
        const ring = radius * (1.45 + amplitude * (0.5 + Math.sin(time * 12) * 0.1));
        context.strokeStyle = "rgba(61, 226, 239, 0.4)";
        context.lineWidth = 1.3;
        context.beginPath();
        context.arc(cx, cy, ring, 0, Math.PI * 2);
        context.stroke();
      }

      frame += 1;
      animationId = requestAnimationFrame(renderFrame);
    };

    animationId = requestAnimationFrame(renderFrame);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animationId = requestAnimationFrame(renderFrame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, audioLevel]);

  return (
    <div className="holographic-core" role="img" aria-label={`Núcleo holográfico OMEKH en estado ${mode}`}>
      <canvas className="holo-canvas" ref={canvasRef} />
      <span className="holo-label">OMEKH CORE · {mode.toUpperCase()}</span>
    </div>
  );
}