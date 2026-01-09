import fs from 'fs-extra';
import path from 'path';
import { VaultManager } from './vault.js';
import { NoteFormatter } from './formatter.js';
import {
  ConversationNoteParams,
  CreateNoteResult,
  NoteStructure,
  AdvancedSearchNotesParams,
  EnrichedSearchResult,
  ListNotesParams,
  ListNotesResult,
  TagOperator,
  SearchInField,
  SortBy,
  SortOrder,
} from '../types/index.js';

export class NoteManager {
  private vault: VaultManager;

  constructor(vault: VaultManager) {
    this.vault = vault;
  }

  async createConversationNote(params: ConversationNoteParams): Promise<CreateNoteResult> {
    try {
      if (!this.vault.validateVaultPath()) {
        return {
          success: false,
          error: 'Obsidian vault path not found or invalid'
        };
      }

      const folder = params.folder || 'MCP Notes';
      this.vault.ensureFolderExists(folder);

      const fileName = this.vault.generateFileName(params.topic, new Date());
      const filePath = this.vault.getFullPath(path.join(folder, fileName));

      if (await this.vault.fileExists(filePath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newFileName = this.vault.generateFileName(`${params.topic} - ${timestamp}`, new Date());
        const newFilePath = this.vault.getFullPath(path.join(folder, newFileName));
        
        const content = NoteFormatter.formatConversationNote(params);
        await this.vault.writeFile(newFilePath, content);
        
        return {
          success: true,
          path: newFilePath
        };
      }

      const content = NoteFormatter.formatConversationNote(params);
      await this.vault.writeFile(filePath, content);

      return {
        success: true,
        path: filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating note'
      };
    }
  }

  async getNoteStructure(notePath: string): Promise<NoteStructure | null> {
    try {
      const fullPath = this.vault.getFullPath(notePath);
      
      if (!await this.vault.fileExists(fullPath)) {
        return null;
      }

      const content = await this.vault.readFile(fullPath);
      const title = NoteFormatter.extractTitleFromContent(content);
      const tags = NoteFormatter.extractTagsFromContent(content);

      const frontmatter = this.extractFrontMatter(content);

      return {
        path: notePath,
        content,
        frontmatter,
        tags
      };

    } catch (error) {
      console.error('Error reading note:', error);
      return null;
    }
  }

  async searchNotes(params: AdvancedSearchNotesParams): Promise<EnrichedSearchResult[]> {
    try {
      const allFiles = await this.vault.listFiles(params.folder);
      const results: EnrichedSearchResult[] = [];
      const BATCH_SIZE = 50;
      const limit = params.limit || 10;
      const offset = params.offset || 0;

      for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batch = allFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(file => this.processSingleFile(file, params))
        );
        results.push(...batchResults.filter((r): r is EnrichedSearchResult => r !== null));
      }

      return results.slice(offset, offset + limit);

    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  async listNotes(params: ListNotesParams): Promise<ListNotesResult> {
    try {
      const allFiles = await this.vault.listFiles(params.folder);
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      const sortBy = params.sortBy || SortBy.NAME;
      const sortOrder = params.sortOrder || SortOrder.ASC;

      const BATCH_SIZE = 50;
      const notes: EnrichedSearchResult[] = [];

      for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batch = allFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            try {
              const fullPath = this.vault.getFullPath(file);
              const stats = await fs.stat(fullPath);

              const content = await this.vault.readFile(fullPath);
              const title = NoteFormatter.extractTitleFromContent(content);
              const tags = NoteFormatter.extractTagsFromContent(content);

              return {
                path: file,
                filename: path.basename(file),
                title,
                excerpt: content.substring(0, 200),
                tags,
                lastModified: stats.mtime,
                content: params.includeContent ? content : undefined,
                matchedFields: []
              };
            } catch (error) {
              console.error(`Error processing file ${file}:`, error);
              return null;
            }
          })
        );
        notes.push(...batchResults.filter((n): n is NonNullable<typeof n> => n !== null));
      }

      notes.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case SortBy.NAME:
            comparison = a.filename.localeCompare(b.filename);
            break;
          case SortBy.DATE:
            comparison = a.lastModified.getTime() - b.lastModified.getTime();
            break;
          case SortBy.SIZE:
            comparison = a.excerpt.length - b.excerpt.length;
            break;
        }

        return sortOrder === SortOrder.ASC ? comparison : -comparison;
      });

      const paginatedNotes = notes.slice(offset, offset + limit);

      return {
        notes: paginatedNotes,
        total: notes.length,
        hasMore: offset + limit < notes.length
      };

    } catch (error) {
      console.error('Error listing notes:', error);
      return {
        notes: [],
        total: 0,
        hasMore: false
      };
    }
  }

  private async processSingleFile(file: string, params: AdvancedSearchNotesParams): Promise<EnrichedSearchResult | null> {
    try {
      const fullPath = this.vault.getFullPath(file);
      const content = await this.vault.readFile(fullPath);
      const title = NoteFormatter.extractTitleFromContent(content);
      const tags = NoteFormatter.extractTagsFromContent(content);
      const filename = path.basename(file);

      const matchedFields: ('filename' | 'title' | 'content' | 'tags')[] = [];
      let matches = true;

      const searchIn = params.searchIn || SearchInField.CONTENT;

      if (params.query) {
        const queryLower = params.query.toLowerCase();

        if (searchIn === SearchInField.FILENAME || searchIn === SearchInField.ALL) {
          if (filename.toLowerCase().includes(queryLower)) {
            matchedFields.push('filename');
          }
        }

        if (searchIn === SearchInField.TITLE || searchIn === SearchInField.ALL) {
          if (title.toLowerCase().includes(queryLower)) {
            matchedFields.push('title');
          }
        }

        if (searchIn === SearchInField.CONTENT || searchIn === SearchInField.ALL) {
          if (content.toLowerCase().includes(queryLower)) {
            matchedFields.push('content');
          }
        }

        if (matchedFields.length === 0) {
          matches = false;
        }
      }

      if (params.regex) {
        try {
          const regex = new RegExp(params.regex, 'i');
          if (regex.test(content)) {
            if (!matchedFields.includes('content')) {
              matchedFields.push('content');
            }
            matches = true;
          } else if (regex.test(filename)) {
            if (!matchedFields.includes('filename')) {
              matchedFields.push('filename');
            }
            matches = true;
          } else if (!params.query) {
            matches = false;
          }
        } catch (error) {
          console.error('Invalid regex pattern:', params.regex);
        }
      }

      if (params.tags && params.tags.length > 0) {
        const tagOperator = params.tagOperator || TagOperator.AND;
        const matchesTags = tagOperator === TagOperator.AND
          ? params.tags.every(tag => tags.includes(tag))
          : params.tags.some(tag => tags.includes(tag));

        if (matchesTags) {
          matchedFields.push('tags');
        } else {
          matches = false;
        }
      }

      if (!matches) {
        return null;
      }

      const stats = await fs.stat(fullPath);

      return {
        path: file,
        filename,
        title,
        excerpt: content.substring(0, 200),
        tags,
        lastModified: stats.mtime,
        content: params.includeContent ? content : undefined,
        matchedFields
      };

    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
      return null;
    }
  }

  private extractFrontMatter(content: string): Record<string, any> | undefined {
    const lines = content.split('\n');
    
    if (lines[0]?.trim() !== '---') return undefined;
    
    const frontMatterEnd = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (frontMatterEnd === -1) return undefined;
    
    const frontMatterLines = lines.slice(1, frontMatterEnd);
    const frontMatter: Record<string, any> = {};
    
    for (const line of frontMatterLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith('[') && value.endsWith(']')) {
          const arrayValue = value.slice(1, -1)
            .split(',')
            .map(item => item.trim().replace(/['"]/g, ''))
            .filter(item => item.length > 0);
          value = arrayValue as any;
        }
        
        frontMatter[key] = value;
      }
    }
    
    return frontMatter;
  }
}