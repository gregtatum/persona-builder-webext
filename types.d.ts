export interface PersonaRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface HistoryRecord {
  id: string;
  personaId: string;
  url: string;
  title: string;
  description: string;
  visitedAt: string;
}

export interface HistoryInput {
  id?: string;
  personaId: string;
  url: string;
  title: string;
  description: string;
  visitedAt: string;
}

export interface PageSnapshotRecord {
  historyId: string;
  personaId: string;
  url: string;
  capturedAt: string;
  html: string;
}

export interface InsightRecord {
  id: string;
  personaId: string;
  kind: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  createdAt: string;
}
