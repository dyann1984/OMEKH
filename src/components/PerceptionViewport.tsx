"use client";

import { useEffect, useRef, useState } from "react";
import { assignPerceptionTracks } from "@/lib/perception-tracking";

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
    const parent = canvas.parentElement;
    if (!parent) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const containerWidth = parent.clientWidth;
    const containerHeight = parent.clientHeight || Math.round(containerWidth * 0.75);
    const scale = Math.max(containerWidth / video.videoWidth, containerHeight / video.videoHeight);
    const offsetX = (containerWidth - video.videoWidth * scale) / 2;
    const offsetY = (containerHeight - video.videoHeight * scale) / 2;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(containerWidth * dpr);
    canvas.height = Math.round(containerHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, containerWidth, containerHeight);

    for (const item of overlayRef.current) {
      const [x, y, width, height] = item.box;
      const drawnWidth = width * scale;
      const drawnHeight = height * scale;
      const drawnX = containerWidth - offsetX - (x + width) * scale;
      const drawnY = offsetY + y * scale;
      context.strokeStyle = item.state === "apareci\u00f3" ? "#d6ad57" : "#3de2ef";
      context.lineWidth = Math.max(2, drawnWidth * 0.035);
      context.strokeRect(drawnX, drawnY, drawnWidth, drawnHeight);
      context.fillStyle = item.state === "apareci\u00f3" ? "rgba(214, 173, 87, 0.16)" : "rgba(61, 226, 239, 0.1)";
      context.fillRect(drawnX, drawnY, drawnWidth, drawnHeight);
      context.fillStyle = "#f3f0e9";
      context.font = `600 ${Math.max(11, Math.min(13, drawnWidth * 0.07))}px Arial`
      context.fillText(`${item.label} ${Math.round(item.score * 100)}%`, drawnX + 4, Math.max(12, drawnY + 4));
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
      const scope = window as Window & {
        tf?: TFModule;
        cocoSsd?: { load: () => Promise<Detector> };
        __OMKEH_PERCEPTION_MODEL_PROMISE?: Promise<Detector>;
      };

      if (!scope.__OMKEH_PERCEPTION_MODEL_PROMISE) {
        scope.__OMKEH_PERCEPTION_MODEL_PROMISE = (async () => {
          if (!scope.tf) {
            await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
          }
          const tensorflow = scope.tf;
          if (!tensorflow) throw new Error("TensorFlow.js no se cargó.");
          try {
            const tfApi = tensorflow as { setBackend?: (backend: string) => Promise<void> };
            if (tfApi.setBackend) await tfApi.setBackend("webgl");
            await tensorflow.ready();
          } catch {
            (tensorflow as { setBackend?: (backend: string) => Promise<void> }).setBackend?.("cpu");
            await tensorflow.ready();
          }

          if (!scope.cocoSsd) {
            await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
          }
          const modelFactory = scope.cocoSsd;
          if (!modelFactory) throw new Error("COCO-SSD no pudo cargarse.");
          const detector = await modelFactory.load();
          return detector;
        })();
      }

      return scope.__OMKEH_PERCEPTION_MODEL_PROMISE as Promise<Detector>;
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
        const { detections: trackedDetections, tracks: retainedTracks } = assignPerceptionTracks(raw, tracksRef.current, now, { movementThreshold: 0.08 });
        tracksRef.current = retainedTracks;
        const nextDetections = trackedDetections.map(classifyTrack);
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
