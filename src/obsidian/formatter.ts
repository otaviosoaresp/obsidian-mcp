import { format } from 'date-fns';
import { ConversationNoteParams, NoteStyle } from '../types/index.js';

export class NoteFormatter {
  static formatConversationNote(
    params: ConversationNoteParams,
    date: Date = new Date()
  ): string {
    const { topic, highlights, tags = [], style = 'concise' } = params;

    const frontMatter = this.generateFrontMatter(tags, style, date);
    const mainContent = this.generateMainContent(topic, highlights, style);

    return `${frontMatter}\n\n${mainContent}`;
  }

  private static generateFrontMatter(
    tags: string[],
    style: NoteStyle,
    date: Date
  ): string {
    const frontMatter: Record<string, string | string[]> = {
      created: format(date, 'yyyy-MM-dd'),
      style,
      tags: [...tags, 'mcp']
    };

    const yamlString = Object.entries(frontMatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        return `${key}: "${value}"`;
      })
      .join('\n');

    return `---\n${yamlString}\n---`;
  }

  private static generateMainContent(
    topic: string,
    highlights: string[],
    style: NoteStyle
  ): string {
    switch (style) {
      case 'concise':
        return this.generateConciseContent(topic, highlights);
      case 'eli5':
        return this.generateEli5Content(topic, highlights);
      case 'detailed':
      default:
        return this.generateDetailedContent(topic, highlights);
    }
  }

  private static generateConciseContent(topic: string, highlights: string[]): string {
    let content = `# ${topic}\n\n`;

    if (highlights.length > 0) {
      highlights.forEach((point) => {
        content += `- ${point}\n`;
      });
    }

    return content;
  }

  private static generateDetailedContent(topic: string, highlights: string[]): string {
    let content = `# ${topic}\n\n`;

    if (highlights.length > 0) {
      highlights.forEach((point) => {
        content += `${point}\n\n`;
      });
    }

    return content;
  }

  private static generateEli5Content(topic: string, highlights: string[]): string {
    let content = `# ${topic}\n\n`;
    content += `> Simple explanation\n\n`;

    if (highlights.length > 0) {
      highlights.forEach((point) => {
        content += `${point}\n\n`;
      });
    }

    return content;
  }

  static extractTitleFromContent(content: string): string {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    
    return 'Untitled';
  }

  static extractTagsFromContent(content: string): string[] {
    const tags: string[] = [];
    const lines = content.split('\n');
    
    let inFrontMatter = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '---') {
        inFrontMatter = !inFrontMatter;
        continue;
      }
      
      if (inFrontMatter && trimmed.startsWith('tags:')) {
        const tagMatch = trimmed.match(/tags:\s*\[(.*?)\]/);
        if (tagMatch) {
          const tagString = tagMatch[1];
          const extractedTags = tagString
            .split(',')
            .map(tag => tag.replace(/['"]/g, '').trim())
            .filter(tag => tag.length > 0);
          tags.push(...extractedTags);
        }
      }
      
      if (!inFrontMatter && trimmed.includes('#')) {
        const hashTags = trimmed.match(/#\w+/g);
        if (hashTags) {
          tags.push(...hashTags.map(tag => tag.substring(1)));
        }
      }
    }
    
    return [...new Set(tags)];
  }
}