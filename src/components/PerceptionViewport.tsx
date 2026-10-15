"use client";

import { useEffect, useRef, useState } from "react";

export interface Detection {
  label: string;
  score: number;
  box: [number, number, number, number];
  trackId: string;
  state: "apareció" | "permanece" | "en movimiento";
  relativeX: "izquierda" | "centro" | "derecha";
  relativeY: "arriba" | "medio" | "abajo";
}

interface Props {
  videoRef: { current: HTMLVideoElement | null };
  cameraActive: boolean;
  onPerception?: (detections: Detection[]) => void;
}

interface Track {
  id: string;
  label: string;
  box: [number, number, number, number];
  lastSeen: number;
  missed: number;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find((script) => script.src === src);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar " + src)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("No se pudo cargar " + src)), { once: true });
    document.head.appendChild(script);
  });
}

type TFModule = {
  ready: () => Promise<void>;
  engine?: { registerBackend: (name: string, factory: () => unknown) => void };
};

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{
    class: string;
    score: number;
    bbox: [number, number, number, number];
  }>>;
};

export default function PerceptionViewport({ videoRef, cameraActive, onPerception }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<Detection[]>([]);
  const tracksRef = useRef<Track[]>([]);
  const detectActiveRef = useRef(false);
  const handleRef = useRef<number | null>(null);
  const [status, setStatus] = useState("Detector no iniciado");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateCanvas() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.videoWidth === 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const item of overlayRef.current) {
      const [x, y, width, height] = item.box;
      context.strokeStyle = item.state === "apareció" ? "#d6ad57" : "#3de2ef";
      context.lineWidth = Math.max(2, canvas.width * 0.0035);
      context.strokeRect(x, y, width, height);
      context.fillStyle = item.state === "apareció" ? "rgba(214, 173, 87, 0.16)" : "rgba(61, 226, 239, 0.1)";
      context.fillRect(x, y, width, height);
      context.fillStyle = "#f3f0e9";
      context.font = `${Math.max(12, canvas.width * 0.018)}px Arial`;
      context.fillText(`${item.label} ${Math.round(item.score * 100)}% · ${item.relativeX}/${item.relativeY}`, x + 4, Math.max(16, y + 4));
    }
  }

  useEffect(() => {
    if (!cameraActive) {
      detectActiveRef.current = false;
      tracksRef.current = [];
      overlayRef.current = [];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetections([]);
      setError(null);
      setStatus("Detector detenido");
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d");
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let cancelled = false;
    detectActiveRef.current = true;
    setStatus("Cargando TensorFlow.js y COCO-SSD desde la red");
    setError(null);

    async function loadDetector() {
      if (!(window as Window & { tf?: TFModule }).tf) {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
      }
      const tensorflow = (window as Window & { tf?: TFModule }).tf;
      if (!tensorflow) throw new Error("TensorFlow.js no pudo cargarse.");
      try {
        await tensorflow.ready();
      } catch {
        if ((tensorflow as { setBackend?: (backend: string) => void }).setBackend) await (tensorflow as { setBackend?: (backend: string) => void }).setBackend?.("cpu");
        await tensorflow.ready();
      }

      if (!(window as Window & { cocoSsd?: { load: () => Promise<Detector> } }).cocoSsd) {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
      }
      const modelFactory = (window as Window & { cocoSsd?: { load: () => Promise<Detector> } }).cocoSsd;
      if (!modelFactory) throw new Error("COCO-SSD no pudo cargarse.");
      return modelFactory.load();
    }

    function classifyTrack(detection: Detection): Detection {
      const video = videoRef.current;
      if (!video) return detection;
      const relativeX = detection.box[0] + detection.box[2] / 2 < video.videoWidth / 3 ? "izquierda" : detection.box[0] + detection.box[2] / 2 > (video.videoWidth * 2) / 3 ? "derecha" : "centro";
      const relativeY = detection.box[1] + detection.box[3] / 2 < video.videoHeight / 3 ? "arriba" : detection.box[1] + detection.box[3] / 2 > (video.videoHeight * 2) / 3 ? "abajo" : "medio";
      return { ...detection, relativeX, relativeY };
    }

    async function loop(detector: Detector) {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) {
        if (detectActiveRef.current && !cancelled) handleRef.current = window.setTimeout(() => void loop(detector), 500);
        return;
      }

      const startedAt = performance.now();
      try {
        const predictions = await detector.detect(video);
        if (!detectActiveRef.current || cancelled) return;
        const now = Date.now();
        const raw = predictions.map((prediction) => classifyTrack({
          label: prediction.class,
          score: prediction.score,
          box: [...prediction.bbox] as [number, number, number, number],
          trackId: "",
          state: "permanece",
          relativeX: "centro",
          relativeY: "medio",
        }));
        const matched = new Set<number>();
        const nextTracks = raw.map((item) => {
          const matchIndex = tracksRef.current.findIndex((track, index) => !matched.has(index) && track.label === item.label && intersectionOverUnion(track.box, item.box) > 0.4);
          const isExisting = matchIndex >= 0;
          if (isExisting) matched.add(matchIndex);
          const trackId = isExisting ? tracksRef.current[matchIndex].id : `track-${Math.random().toString(36).slice(2, 8)}`;
          if (isExisting) tracksRef.current[matchIndex].box = item.box;
          else tracksRef.current.push({ id: trackId, label: item.label, box: item.box, lastSeen: now, missed: 0 });
          return { ...item, trackId, state: (isExisting && deltaSince(tracksRef.current.find((track) => track.id === trackId), now) <= 1200 ? "permanece" : "apareció") as Detection["state"] };
        });

        tracksRef.current = tracksRef.current
          .map((track) => (matched.has(tracksRef.current.indexOf(track)) ? { ...track, lastSeen: now, missed: 0 } : { ...track, missed: track.missed + 1 }))
          .filter((track) => track.missed <= 8);

        const nextDetections = nextTracks.map(classifyTrack);
        overlayRef.current = nextDetections;
        setDetections(nextDetections);
        setLatency(Math.round(performance.now() - startedAt));
        setStatus(nextDetections.length ? `${nextDetections.length} elemento(s) detectado(s) con COCO-SSD` : "Sin objetos reconocibles");
        setError(null);
        onPerception?.(nextDetections);

        if (detectActiveRef.current && !cancelled) {
          updateCanvas();
          handleRef.current = window.setTimeout(() => void loop(detector), 480);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo ejecutar la detección");
        setStatus("Error de detección");
        if (detectActiveRef.current && !cancelled) {
          handleRef.current = window.setTimeout(() => void loop(detector), 1500);
        }
      }
    }

    async function run() {
      try {
        const detector = await loadDetector();
        if (!detectActiveRef.current || cancelled) return;
        setStatus("Detector listo. Analizando fotogramas...");
        void loop(detector);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el detector");
        setStatus("Detector bloqueado");
      }
    }

    void run();

    return () => {
      cancelled = true;
      detectActiveRef.current = false;
      if (handleRef.current) window.clearTimeout(handleRef.current);
    };
  }, [cameraActive, onPerception, videoRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="perception-viewport">
      <canvas ref={canvasRef} className="perception-canvas" aria-label="Percepción visual en tiempo real" />
      {error && <p className="description muted">{error}</p>}
      <div className="perception-metrics">
        <span>Detector: {status}</span>
        <span>Objetos: {detections.length}</span>
        <span>Latencia estimada: {latency !== null ? latency + " ms" : "sin datos"}</span>
      </div>
      {detections.length > 0 && (
        <ul className="perception-list">
          {detections.map((item) => (
            <li key={item.trackId}>
              <strong>{item.label}</strong> · {Math.round(item.score * 100)}% · {item.relativeX}/{item.relativeY} · {item.state}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function intersectionOverUnion(a: [number, number, number, number], b: [number, number, number, number]) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a[2] * a[3] + b[2] * b[3] - intersection;
  return union === 0 ? 0 : intersection / union;
}

function deltaSince(track: Track | undefined, now: number) {
  return track ? now - (track.lastSeen || now) : 0;
}
