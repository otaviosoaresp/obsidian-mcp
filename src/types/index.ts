export type NoteStyle = 'concise' | 'detailed' | 'eli5';

export interface ConversationNoteParams {
  topic: string;
  highlights: string[];
  tags?: string[];
  folder?: string;
  style?: NoteStyle;
}

export interface SearchNotesParams {
  query?: string;
  tags?: string[];
  limit?: number;
}

export enum TagOperator {
  AND = 'AND',
  OR = 'OR'
}

export enum SearchInField {
  FILENAME = 'filename',
  TITLE = 'title',
  CONTENT = 'content',
  ALL = 'all'
}

export enum SortBy {
  NAME = 'name',
  DATE = 'date',
  SIZE = 'size'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export interface AdvancedSearchNotesParams extends SearchNotesParams {
  folder?: string;
  tagOperator?: TagOperator;
  searchIn?: SearchInField;
  regex?: string;
  includeContent?: boolean;
  offset?: number;
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

export interface EnrichedSearchResult extends SearchResult {
  filename: string;
  content?: string;
  matchedFields: ('filename' | 'title' | 'content' | 'tags')[];
}

export interface ListNotesParams {
  folder?: string;
  limit?: number;
  offset?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  includeContent?: boolean;
}

export interface ListNotesResult {
  notes: EnrichedSearchResult[];
  total: number;
  hasMore: boolean;
}