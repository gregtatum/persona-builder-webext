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
  insight_summary: string;
  category: string;
  intent: string;
  score: number;
  updated_at: number;
  is_deleted: boolean;
}

export type InsightInput = Omit<InsightRecord, "personaId" | "id"> & {
  id?: string;
};
