import { CANDIDATE_SNAPSHOT_STORE, dbPromise } from './appDb';

const bySnapshotAt = (a, b) => new Date(a.snapshotAt).getTime() - new Date(b.snapshotAt).getTime();

export const saveCandidateSnapshot = async (snapshot) => {
  if (!snapshot?.videoId || !snapshot?.snapshotAt) return;

  const db = await dbPromise;
  await db.put(CANDIDATE_SNAPSHOT_STORE, snapshot);
};

export const getCandidateSnapshots = async () => {
  const db = await dbPromise;
  const snapshots = await db.getAll(CANDIDATE_SNAPSHOT_STORE);
  return snapshots.sort(bySnapshotAt);
};

export const getCandidateSnapshotsByVideoId = async (videoId) => {
  const db = await dbPromise;
  const snapshots = await db.getAllFromIndex(CANDIDATE_SNAPSHOT_STORE, 'videoId', videoId);
  return snapshots.sort(bySnapshotAt);
};
