import path from 'path';
import { VaultManager } from './vault.js';
import { NoteFormatter } from './formatter.js';
import { ConversationNoteParams, CreateNoteResult, NoteStructure } from '../types/index.js';

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

  async searchNotes(query?: string, tags?: string[], limit: number = 10): Promise<string[]> {
    try {
      const allFiles = await this.vault.listFiles();
      const results: string[] = [];

      for (const file of allFiles) {
        if (results.length >= limit) break;

        const fullPath = this.vault.getFullPath(file);
        const content = await this.vault.readFile(fullPath);

        let matches = true;

        if (query && !content.toLowerCase().includes(query.toLowerCase())) {
          matches = false;
        }

        if (tags && tags.length > 0) {
          const fileTags = NoteFormatter.extractTagsFromContent(content);
          const hasAllTags = tags.every(tag => fileTags.includes(tag));
          if (!hasAllTags) matches = false;
        }

        if (matches) {
          results.push(file);
        }
      }

      return results;

    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
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