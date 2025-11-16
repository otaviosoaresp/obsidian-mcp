import { format } from 'date-fns';
import { ConversationNoteParams } from '../types/index.js';

export class NoteFormatter {
  static formatConversationNote(
    params: ConversationNoteParams,
    date: Date = new Date()
  ): string {
    const { topic, highlights, tags = [], context } = params;
    
    const frontMatter = this.generateFrontMatter(topic, tags, date, context);
    const mainContent = this.generateMainContent(highlights, context);
    
    return `${frontMatter}\n\n${mainContent}`;
  }

  private static generateFrontMatter(
    topic: string,
    tags: string[],
    date: Date,
    context?: string
  ): string {
    const frontMatter: Record<string, any> = {
      created: format(date, 'yyyy-MM-dd'),
      context: context || 'AI Conversation',
      tags: [...tags, 'mcp', 'ai']
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

  private static generateMainContent(highlights: string[], context?: string): string {
    let content = `# ${highlights[0] || 'Conversation Note'}\n\n`;

    if (highlights.length > 0) {
      content += '## Key Points\n\n';
      highlights.forEach((point, index) => {
        content += `${index + 1}. ${point}\n`;
      });
      content += '\n';
    }

    if (context) {
      content += '## Discussion Context\n\n';
      content += `${context}\n\n`;
    }

    content += `---\n*Generated via MCP on ${format(new Date(), 'MM/dd/yyyy HH:mm')}*`;

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