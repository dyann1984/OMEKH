"use client";

import { useEffect, useRef } from "react";

export type HoloMode = "idle" | "listening" | "analyzing" | "speaking" | "alert" | "error";

interface Props {
  mode?: HoloMode;
  audioLevel?: number;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compilation failed: " + info);
  }
  return shader;
}

export default function HolographicCore({ mode = "idle", audioLevel = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amplitudeRef = useRef(Math.min(1, Math.max(0, audioLevel / 100)));
  useEffect(() => {
    amplitudeRef.current = Math.min(1, Math.max(0, audioLevel / 100));
  }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: true }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) {
      return;
    }
    const context = gl as WebGLRenderingContext;

    const vertexSource = `
      attribute vec2 aPosition;
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vColor;
      void main(void) {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        gl_PointSize = aSize;
        vColor = aColor;
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec3 vColor;
      void main(void) {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distance = length(coord);
        if (distance > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.18, 0.5, distance);
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    const program = context.createProgram()!;
    const vertexShader = compileShader(context, context.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, fragmentSource);
    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      throw new Error("Program link failed: " + context.getProgramInfoLog(program));
    }
    context.useProgram(program);

    const positionBuffer = context.createBuffer()!;
    const colorBuffer = context.createBuffer()!;
    const sizeBuffer = context.createBuffer()!;
    const pointCount = reducedMotion ? 84 : 156;

    const positions = new Float32Array(pointCount * 2);
    const colors = new Float32Array(pointCount * 3);
    const sizes = new Float32Array(pointCount);
    const particles = Array.from({ length: pointCount }, (_, index) => {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / pointCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      return {
        baseX: Math.sin(phi) * Math.cos(theta),
        baseY: Math.cos(phi),
        baseZ: Math.sin(phi) * Math.sin(theta),
        depth: 0.2 + ((index * 17) % 100) / 200,
        phase: index * 0.37,
        speed: 0.25 + ((index * 13) % 90) / 100,
      };
    });

    const links: Array<[number, number]> = [];
    const linkStep = Math.max(2, Math.floor(pointCount / 17));
    for (let index = 0; index < pointCount; index += linkStep) {
      links.push([index, (index + Math.floor(pointCount / 4)) % pointCount]);
    }

    context.enable(context.BLEND);
    context.blendFunc(context.SRC_ALPHA, context.ONE);

    let frame = 0;
    let animationId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.min(520, Math.max(250, canvas.parentElement?.clientWidth || 320));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(width * dpr);
      context.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const resizeListener = () => resize();
    window.addEventListener("resize", resizeListener);



    const modeColor = (particleIndex: number) => {
      if (mode === "error") return [0.9, 0.34, 0.3];
      if (mode === "alert") return [0.92, 0.5, 0.35];
      if (mode === "listening") return particleIndex % 4 === 0 ? [0.84, 0.68, 0.34] : [0.24, 0.89, 0.94];
      if (mode === "analyzing") return particleIndex % 3 === 0 ? [0.84, 0.68, 0.34] : [0.95, 0.94, 0.88];
      if (mode === "speaking") return particleIndex % 2 === 0 ? [0.84, 0.68, 0.34] : [0.24, 0.89, 0.94];
      return particleIndex % 5 === 0 ? [0.76, 0.65, 0.32] : [0.35, 0.55, 0.72];
    };

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const viewportSize = Math.min(width, height);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.33;
      const time = frame * 0.016;
      const pulse = reducedMotion ? 0 : Math.sin(time * 1.7) * (mode === "listening" ? 0.06 + amplitudeRef.current * 0.24 : 0.05);
      const rotationY = time * (mode === "analyzing" ? 1.25 : 0.45);
      const rotationX = mode === "analyzing" ? 0.55 + Math.sin(time * 3.2) * 0.25 : 0.42;
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);
      const scatter = mode === "error" ? 0.08 : 0;

      for (let index = 0; index < pointCount; index += 1) {
        const particle = particles[index];
        const breathe = 1 +
          (mode === "idle"
            ? Math.sin(time * 1.3 + particle.phase) * 0.05
            : mode === "listening"
              ? Math.sin(time * (4 + particle.speed) + particle.phase) * amplitudeRef.current * 0.28
              : mode === "analyzing"
                ? Math.sin(time * 8 + particle.phase) * 0.18 + 0.05
                : mode === "speaking"
                  ? Math.sin(time * 7 + particle.phase) * (0.08 + amplitudeRef.current * 0.16)
                  : mode === "error"
                    ? Math.sin(time * 5 + particle.phase) * (-0.06)
                    : Math.sin(time * 1.5 + particle.phase) * 0.05);
        const responseRadius = (radius * (0.35 + particle.depth * 0.95) * (1 + pulse)) * breathe + scatter * radius;

        const x = particle.baseX * responseRadius;
        const y = particle.baseY * responseRadius;
        const z = particle.baseZ * responseRadius;

        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        const ry = y * cosX - rz * sinX;
        const rz2 = y * sinX + rz * cosX;

        const projectedScale = 1 / (1.45 + rz2 / (viewportSize * 0.36));
        const px = cx + (rx * projectedScale) / dpr;
        const py = cy + (ry * projectedScale) / dpr;
        const depthBoost = Math.max(0, Math.min(1, (rz2 + radius) / (radius * 2)));

        positions[index * 2] = ((px / width) * 2 - 1);
        positions[index * 2 + 1] = -((py / height) * 2 - 1);
        const color = modeColor(index);
        const brightness =
          0.45 + depthBoost * 0.45 + (mode === "listening" ? amplitudeRef.current * 0.2 : 0);
        for (let channel = 0; channel < 3; channel += 1) {
          colors[index * 3 + channel] = color[channel] * brightness;
        }
        sizes[index] = (1.4 + particle.depth * 2.4) * (1 + amplitudeRef.current * (mode === "listening" ? 1 : 0.25)) * dpr;
      }

      context.clearColor(0, 0, 0, 0);
      context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
      context.viewport(0, 0, canvas.width, canvas.height);

      context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
      context.bufferData(context.ARRAY_BUFFER, positions, context.DYNAMIC_DRAW);
      const positionLocation = context.getAttribLocation(program, "aPosition");
      context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
      context.enableVertexAttribArray(positionLocation);

      context.bindBuffer(context.ARRAY_BUFFER, colorBuffer);
      context.bufferData(context.ARRAY_BUFFER, colors, context.DYNAMIC_DRAW);
      const colorLocation = context.getAttribLocation(program, "aColor");
      context.vertexAttribPointer(colorLocation, 3, context.FLOAT, false, 0, 0);
      context.enableVertexAttribArray(colorLocation);

      context.bindBuffer(context.ARRAY_BUFFER, sizeBuffer);
      context.bufferData(context.ARRAY_BUFFER, sizes, context.DYNAMIC_DRAW);
      const sizeLocation = context.getAttribLocation(program, "aSize");
      context.vertexAttribPointer(sizeLocation, 1, context.FLOAT, false, 0, 0);
      context.enableVertexAttribArray(sizeLocation);

      // Filaments.
      const linePositions = new Float32Array(links.length * 4);
      let lineVertices = 0;
      for (const [from, to] of links) {
        linePositions[lineVertices++] = positions[from * 2];
        linePositions[lineVertices++] = positions[from * 2 + 1];
        linePositions[lineVertices++] = positions[to * 2];
        linePositions[lineVertices++] = positions[to * 2 + 1];
      }
      const filamentBuffer = context.createBuffer();
      context.bindBuffer(context.ARRAY_BUFFER, filamentBuffer);
      context.bufferData(context.ARRAY_BUFFER, linePositions, context.DYNAMIC_DRAW);
      context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
      context.enableVertexAttribArray(positionLocation);
      context.disableVertexAttribArray(colorLocation);
      context.disableVertexAttribArray(sizeLocation);
      context.vertexAttrib3f(colorLocation, 0.24, 0.89, 0.94);
      context.vertexAttrib1f(sizeLocation, 1);
      context.lineWidth(1);
      const linkColor =
        mode === "error" ? [0.94, 0.45, 0.39] : mode === "speaking" ? [0.84, 0.68, 0.34] : [0.24, 0.89, 0.94];
      context.vertexAttrib3f(colorLocation, linkColor[0], linkColor[1], linkColor[2]);
      context.drawArrays(context.LINES, 0, lineVertices / 2);

      // Points.
      context.disableVertexAttribArray(colorLocation);
      context.enableVertexAttribArray(colorLocation);
      context.bindBuffer(context.ARRAY_BUFFER, colorBuffer);
      context.vertexAttribPointer(colorLocation, 3, context.FLOAT, false, 0, 0);
      context.bindBuffer(context.ARRAY_BUFFER, sizeBuffer);
      context.vertexAttribPointer(sizeLocation, 1, context.FLOAT, false, 0, 0);
      context.enableVertexAttribArray(sizeLocation);
      context.drawArrays(context.POINTS, 0, pointCount);

      // Glowing core.
      context.disable(context.DEPTH_TEST);
      const corePoints = 128;
      const coreRadius =
        mode === "error"
          ? 0.08
          : mode === "analyzing"
            ? 0.15 + Math.sin(time * 8) * 0.025
            : 0.14 + Math.sin(time * 1.6) * 0.012 + amplitudeRef.current * (mode === "listening" ? 0.06 : 0);
      const coreData = new Float32Array(corePoints * 2);
      for (let index = 0; index < corePoints; index += 1) {
        const angle = (index / corePoints) * Math.PI * 2;
        coreData[index * 2] = Math.cos(angle) * coreRadius;
        coreData[index * 2 + 1] = Math.sin(angle) * (coreRadius * ((width || 1) / (height || 1)));
      }
      context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
      context.bufferData(context.ARRAY_BUFFER, coreData, context.DYNAMIC_DRAW);
      context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
      context.enableVertexAttribArray(positionLocation);
      context.disableVertexAttribArray(colorLocation);
      context.disableVertexAttribArray(sizeLocation);
      context.vertexAttrib3f(colorLocation, mode === "error" ? 0.94 : 0.84, mode === "error" ? 0.45 : 0.68, mode === "error" ? 0.4 : 0.34);
      context.vertexAttrib1f(sizeLocation, 1.5);
      context.drawArrays(context.POINTS, 0, corePoints);

      frame += 1;
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    const visibilityListener = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animationId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", visibilityListener);

    return () => {
      document.removeEventListener("resize", resizeListener);
      document.removeEventListener("visibilitychange", visibilityListener);
      cancelAnimationFrame(animationId);
      context.deleteProgram(program);
      context.deleteShader(vertexShader);
      context.deleteShader(fragmentShader);
      context.deleteBuffer(positionBuffer);
      context.deleteBuffer(colorBuffer);
      context.deleteBuffer(sizeBuffer);
    };
  }, [mode]);

  return (
    <div className="holographic-core" role="img" aria-label={`Núcleo holográfico OMEKH en estado ${mode}`}>
      <canvas className="holo-canvas" ref={canvasRef} />
      <span className="holo-label">OMEKH CORE · {mode.toUpperCase()}</span>
    </div>
  );
}