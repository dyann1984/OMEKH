function center(box) {
  return [box[0] + box[2] / 2, box[1] + box[3] / 2];
}

function relativeMovement(previousBox, nextBox) {
  const [px, py] = center(previousBox);
  const [nx, ny] = center(nextBox);
  const size = Math.max(1, Math.min(previousBox[2], previousBox[3]));
  return Math.hypot(nx - px, ny - py) / size;
}

function intersectionOverUnion(a, b) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a[2] * a[3] + b[2] * b[3] - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function assignPerceptionTracks(newObservations, previousTracks = [], now = 0, { iouThreshold = 0.35, movementThreshold = 0.18, maxMissedFrames = 8 } = {}) {
  const nowValue = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const usedTrackIds = new Set();
  const candidates = [];

  for (const observation of newObservations) {
    for (const track of previousTracks) {
      if (track.label !== observation.label || usedTrackIds.has(track.id)) continue;
      const iou = intersectionOverUnion(track.box, observation.box);
      if (iou >= iouThreshold) candidates.push({ iou, observation, track });
    }
  }

  candidates.sort((a, b) => b.iou - a.iou);

  const assignedTracks = new Map();
  for (const item of candidates) {
    if (assignedTracks.has(item.observation) || assignedTracks.has(item.track)) continue;
    assignedTracks.set(item.observation, item.track);
  }

  const retainedTracks = [];
  const detections = newObservations.map((observation) => {
    const matchedTrack = assignedTracks.get(observation);
    if (!matchedTrack) {
      const track = {
        id: `track-${Math.random().toString(36).slice(2, 8)}`,
        label: observation.label,
        box: observation.box,
        score: observation.score,
        firstSeen: nowValue,
        lastSeen: nowValue,
        missedFrames: 0,
      };
      retainedTracks.push(track);
      return {
        ...observation,
        trackId: track.id,
        firstSeenAt: track.firstSeen,
        lastSeenAt: track.lastSeen,
        state: "apareció",
      };
    }

    const movement = relativeMovement(matchedTrack.box, observation.box);
    matchedTrack.lastSeen = nowValue;
    matchedTrack.box = observation.box;
    matchedTrack.score = observation.score;
    matchedTrack.missedFrames = 0;
    retainedTracks.push(matchedTrack);
    return {
      ...observation,
      trackId: matchedTrack.id,
      firstSeenAt: matchedTrack.firstSeen,
      lastSeenAt: matchedTrack.lastSeen,
      state: movement >= movementThreshold ? "en movimiento" : "permanece",
    };
  });

  const retainedIds = new Set(retainedTracks.map((track) => track.id));
  for (const track of previousTracks) {
    if (retainedIds.has(track.id)) continue;
    const missed = (track.missedFrames || 0) + 1;
    if (missed <= maxMissedFrames) retainedTracks.push({ ...track, missedFrames: missed });
  }

  return { detections, tracks: retainedTracks.filter((track) => !track.missedFrames || track.missedFrames <= maxMissedFrames) };
}