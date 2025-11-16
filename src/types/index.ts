export interface ConversationNoteParams {
  topic: string;
  highlights: string[];
  tags?: string[];
  folder?: string;
  context?: string;
}

export interface SearchNotesParams {
  query?: string;
  tags?: string[];
  limit?: number;
}

export interface NoteStructure {
  path: string;
  content: string;
  frontmatter?: Record<string, any>;
  tags: string[];
}

export interface MCPConfig {
  vaultPath: string;
  defaultFolder: string;
  dateFormat: string;
  autoTag: boolean;
  noteFormat: {
    includeTimestamp: boolean;
    includeContext: boolean;
    template: string;
  };
}

export interface CreateNoteResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface SearchResult {
  path: string;
  title: string;
  excerpt: string;
  tags: string[];
  lastModified: Date;
}