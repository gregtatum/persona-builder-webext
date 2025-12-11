/**
 * The persona is a data structure that represents a user and their associated browsing
 * history. It can be used to synthesize a realistic Firefox profile. This JSON file
 * is specified with this Persona type.
 *
 * The file structure for the zip that gets exported is as follows:
 *
 * Persona-DIYer.zip
 * ├── persona.json
 * └── snapshot
 *   ├── example-blog.com
 *   │   ├── index.html
 *   │   ├── writing_2021_encoding-text-utf-32-utf-16-unicode.html
 *   │   ├── writing_2021_encoding-text-utf-8-unicode.html
 *   │   └── writing_2024_translations.html
 *   └── www.homedepot.com
 *       ├── c_appliance-sales.html
 *       └── index.html
 */
export interface Persona {
  persona: PersonaDetails;
  history: PersonaHistory[];
  insights: PersonaInsights[];
}

export interface PersonaDetails {
  name: string;
  createdAt: string;
}

export interface PersonaHistory {
  url: string;
  title: string;
  description: string;
  visitedAt: string;
  snapshotPath: string | null;
}

export interface PersonaInsights {
  insight_summary: string;
  category: string;
  intent: string;
  score: number;
  updated_at: number;
  is_deleted: boolean;
}
