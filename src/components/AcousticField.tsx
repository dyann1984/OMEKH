"use client";

import { useEffect, useRef } from "react";

interface Props {
  analyserRef: { current: AnalyserNode | null };
  active: boolean;
  mode?: "waves" | "particles" | "combined";
  intensity?: number;
  density?: number;
}

export default function AcousticField({ analyserRef, active, mode = "combined", intensity = 0.8, density = 112 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
    const context2d = gl ? null : canvas.getContext("2d");
    if (!gl && !context2d) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particleCount = reducedMotion ? Math.max(48, Math.round(density / 3)) : Math.max(96, Math.min(180, Math.round(density)));
    const particles = Array.from({ length: particleCount }, (_, index) => ({
      angle: (index / particleCount) * Math.PI * 2,
      depth: 0.22 + (((index * 13) % 70) / 200),
      band: index % 3,
      phase: index * 0.43,
    }));

    let animationId = 0;
    const rawFrequency = new Uint8Array(2048);
    const rawTime = new Uint8Array(2048);
    let previousEnergy = 0;
    let beatPulse = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth || 320;
      const height = parent.clientHeight || Math.round(width * 0.62);
      const dpr = reducedMotion ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      if (context2d) context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let vertexProgram: WebGLProgram | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    let colorBuffer: WebGLBuffer | null = null;
    let sizeBuffer: WebGLBuffer | null = null;
    let lineBuffer: WebGLBuffer | null = null;
    let positionLocation = -1;
    let colorLocation = -1;
    let sizeLocation = -1;

    if (gl) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      vertexProgram = gl.createProgram() as WebGLProgram;
      const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(vertexShader, "attribute vec2 aPosition; attribute vec3 aColor; attribute float aSize; varying vec3 vColor; void main(void){ gl_Position=vec4(aPosition,0.0,1.0); gl_PointSize=aSize; vColor=aColor; }");
      gl.compileShader(vertexShader);
      gl.shaderSource(fragmentShader, "precision mediump float; varying vec3 vColor; void main(void){ vec2 coordinate=gl_PointCoord-vec2(0.5); float distance=length(coordinate); if(distance>0.5) discard; float alpha=(1.0-smoothstep(0.18,0.5,distance))*0.95; gl_FragColor=vec4(vColor,alpha); }");
      gl.compileShader(fragmentShader);
      gl.attachShader(vertexProgram as WebGLProgram, vertexShader);
      gl.attachShader(vertexProgram as WebGLProgram, fragmentShader);
      gl.linkProgram(vertexProgram as WebGLProgram);
      gl.useProgram(vertexProgram);
      positionLocation = gl.getAttribLocation(vertexProgram, "aPosition");
      colorLocation = gl.getAttribLocation(vertexProgram, "aColor");
      sizeLocation = gl.getAttribLocation(vertexProgram, "aSize");
      positionBuffer = gl.createBuffer();
      colorBuffer = gl.createBuffer();
      sizeBuffer = gl.createBuffer();
      lineBuffer = gl.createBuffer();
    }


    const render = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;

      if (!active) {
        if (context2d) {
          context2d.clearRect(0, 0, width, height);
        } else if (gl) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        animationId = requestAnimationFrame(render);
        return;
      }

      const analyser = analyserRef.current;
      let rms = 0;
      let lowEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;
      let transient = 0;

      if (analyser) {
        if (analyser.fftSize < 1024) analyser.fftSize = 1024;
        analyser.getByteFrequencyData(rawFrequency);
        analyser.getByteTimeDomainData(rawTime);
        const length = Math.min(rawTime.length, analyser.fftSize);
        let sum = 0;
        for (let i = 0; i < length; i += 1) {
          const value = (rawTime[i] - 128) / 128;
          sum += value * value;
        }
        rms = Math.sqrt(sum / length);
        const bins = Math.min(rawFrequency.length, 384);
        const third = Math.max(1, Math.floor(bins / 3));
        for (let i = 0; i < third; i += 1) lowEnergy += rawFrequency[i];
        for (let i = third; i < third * 2; i += 1) midEnergy += rawFrequency[i];
        for (let i = third * 2; i < bins; i += 1) highEnergy += rawFrequency[i];
        lowEnergy = (lowEnergy / (third * 255)) * Math.max(0, intensity * 1.2);
        midEnergy = (midEnergy / (third * 255)) * Math.max(0, intensity * 1.2);
        highEnergy = (highEnergy / (Math.max(1, bins - third * 2) * 255)) * Math.max(0, intensity * 1.2);
        transient = Math.min(1, Math.max(0, Math.abs(rms - previousEnergy) * 9));
        beatPulse = Math.max(beatPulse * 0.84, transient * 0.9);
        previousEnergy = previousEnergy * 0.82 + rms * 0.18;
      }

      if (!gl && context2d) {
        context2d.clearRect(0, 0, width, height);
        context2d.save();
        context2d.globalCompositeOperation = "lighter";
        for (let ring = 0; ring < (rms > 0.04 ? 4 : 2); ring += 1) {
          const ringRadius = Math.min(width, height) * (0.24 + ring * 0.15) * (0.92 + rms * 0.8 + intensity * 0.12);
          const alpha = 0.18 + rms * 0.5 + beatPulse * 0.2;
          context2d.strokeStyle = ring % 2 === 0 ? `rgba(61,226,239,${Math.min(1, alpha)})` : `rgba(214,173,87,${Math.min(1, alpha * 0.9)})`;
          context2d.lineWidth = 2 + beatPulse * 4 + rms * 6;
          context2d.beginPath();
          context2d.arc(width / 2, height / 2, ringRadius, 0, Math.PI * 2);
          context2d.stroke();
        }
        for (let index = 0; index < Math.max(44, Math.round(density / 3)); index += 1) {
          const band = index % 3;
          const bandEnergy = band === 0 ? lowEnergy : band === 1 ? midEnergy : highEnergy;
          const angle = (index / Math.max(1, density)) * Math.PI * 2 + time * (0.02 + bandEnergy * intensity * 0.05);
          const particleRadius = Math.min(width, height) * (0.2 + ((((index * 13) % 40) / 200)) * (0.86 + bandEnergy * 1.7 + rms * 1.5));
          const x = width / 2 + Math.cos(angle) * particleRadius;
          const y = height / 2 + Math.sin(angle) * particleRadius;
          context2d.fillStyle = band === 0 ? `rgba(214,173,87,${0.35 + bandEnergy * 0.45 + intensity * 0.18})` : band === 1 ? `rgba(61,226,239,${0.34 + bandEnergy * 0.38 + intensity * 0.15})` : `rgba(243,240,233,${0.28 + bandEnergy * 0.3 + intensity * 0.12})`;
          context2d.beginPath();
          context2d.arc(x, y, 1.8 + bandEnergy * 3.2 + beatPulse * 1.8 + intensity * 0.6, 0, Math.PI * 2);
          context2d.fill();
        }
        context2d.restore();
        beatPulse *= 0.86;
        previousEnergy = previousEnergy * 0.82 + rms * 0.18;
        animationId = requestAnimationFrame(render);
        return;
      }

      if (!gl || positionLocation < 0 || colorLocation < 0 || !positionBuffer || !colorBuffer || !sizeBuffer || !lineBuffer) {
        animationId = requestAnimationFrame(render);
        return;
      }

      gl.clear(gl.COLOR_BUFFER_BIT);

      const positions = new Float32Array(particleCount * 2);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const lineVertices: number[] = [];
      const waveCount = (reducedMotion || mode === "particles") ? 0 : Math.max(1, mode === "waves" ? 2 : 3);

      for (let ring = 0; ring < (waveCount < 0 ? 0 : waveCount); ring += 1) {
        const bandEnergy = ring % 3 === 0 ? lowEnergy : ring % 3 === 1 ? midEnergy : highEnergy;
        const radius = Math.min(width, height) * (0.28 + ring * 0.16) * (0.86 + bandEnergy * 1.1 + beatPulse * 0.15);
        for (let segment = 0; segment < 64; segment += 1) {
          const angle = (segment / 64) * Math.PI * 2;
          const nextAngle = ((segment + 1) / 64) * Math.PI * 2;
          lineVertices.push(Math.cos(angle) * (radius / width), Math.sin(angle) * (radius / height));
          lineVertices.push(Math.cos(nextAngle) * (radius / width), Math.sin(nextAngle) * (radius / height));
        }
      }

      for (let index = 0; index < particleCount; index += 1) {
        const band = particles[index].band;
        const bandEnergy = band === 0 ? lowEnergy : band === 1 ? midEnergy : highEnergy;
        if (!reducedMotion) {
          particles[index].angle += 0.0016 + (0.004 + bandEnergy * intensity * 0.018) * (rms > 0.004 ? 1 : 0.12);
        }
        const particleRadius = Math.min(width, height) * (0.18 + ((index * 13) % 50) / 200) * (0.85 + bandEnergy * 1.4 + rms * 1.2 + beatPulse * 0.45 * intensity);
        positions[index * 2] = (Math.cos(particles[index].angle + particles[index].phase) * particleRadius) / width;
        positions[index * 2 + 1] = (Math.sin(particles[index].angle + particles[index].phase) * particleRadius) / height;
        const color = band === 0 ? [0.95, 0.72, 0.32] : band === 1 ? [0.24, 0.94, 0.98] : [0.96, 0.96, 0.9];
        const brightness = 0.24 + intensity * ((bandEnergy * 3.3 + rms * 2.5 + beatPulse * 1.2) * 0.5);
        colors[index * 3] = color[0] * brightness;
        colors[index * 3 + 1] = color[1] * brightness;
        colors[index * 3 + 2] = color[2] * brightness;
        sizes[index] = 1.8 + ((particles[index].depth * 2.4) + bandEnergy * 3 + rms * 1.6 + beatPulse * 1.5) * intensity;
      }

      const ringVertices = [...lineVertices];
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(sizeLocation);
      gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, particleCount);

      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ringVertices), gl.STREAM_DRAW);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.disableVertexAttribArray(colorLocation);
      gl.disableVertexAttribArray(sizeLocation);
      gl.vertexAttrib4f(colorLocation, 0.3, 0.85, 0.95, 0.26 + (lowEnergy + midEnergy) * (0.35 + intensity * 0.4));
      gl.vertexAttrib1f(sizeLocation, 1.5);
      gl.drawArrays(gl.LINES, 0, ringVertices.length / 2);

      const pulseVertices: number[] = [];
      const pulseRadius = Math.min(width, height) * (0.14 + beatPulse * 0.25 + (rms > 0.2 ? highEnergy * 0.12 : 0));
      for (let segment = 0; segment < 96; segment += 1) {
        const angle = (segment / 96) * Math.PI * 2;
        const nextAngle = ((segment + 1) / 96) * Math.PI * 2;
        pulseVertices.push(Math.cos(angle) * (pulseRadius / width), Math.sin(angle) * (pulseRadius / height));
        pulseVertices.push(Math.cos(nextAngle) * (pulseRadius / width), Math.sin(nextAngle) * (pulseRadius / height));
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pulseVertices), gl.STREAM_DRAW);
      gl.vertexAttrib4f(colorLocation, 0.9, 0.85, 0.7, 0.35 + beatPulse * 0.45 + (transient > 0.5 ? 0.18 : 0));
      gl.drawArrays(gl.LINES, 0, pulseVertices.length / 2);

      beatPulse *= 0.84 + (transient > 0.15 ? 0.08 : 0);
      previousEnergy = previousEnergy * 0.82 + rms * 0.18;
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
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibilityListener);
      cancelAnimationFrame(animationId);
      if (gl) {
        if (vertexProgram) gl.deleteProgram(vertexProgram);
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (colorBuffer) gl.deleteBuffer(colorBuffer);
        if (sizeBuffer) gl.deleteBuffer(sizeBuffer);
        if (lineBuffer) gl.deleteBuffer(lineBuffer);
      }
    };
  }, [active, analyserRef, intensity, mode, density]);

  return (
    <canvas
      ref={canvasRef}
      className="acoustic-field"
      aria-label={active ? "Campo acústico volumétrico activo" : "Campo acústico detenido"}
      role="img"
    />
  );
}
