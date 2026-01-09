#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';
import { VaultManager } from './obsidian/vault.js';
import { NoteManager } from './obsidian/note.js';
import {
  MCPConfig,
  ConversationNoteParams,
  AdvancedSearchNotesParams,
  ListNotesParams
} from './types/index.js';

class ObsidianMCPServer {
  private server: Server;
  private vaultManager: VaultManager;
  private noteManager: NoteManager;
  private config!: MCPConfig;

  constructor() {
    this.server = new Server({
      name: 'obsidian-mcp',
      version: '1.0.0',
    });

    this.loadConfig();
    this.vaultManager = new VaultManager(this.config);
    this.noteManager = new NoteManager(this.vaultManager);
    
    this.setupToolHandlers();
  }

  private loadConfig(): void {
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;

    if (!vaultPath) {
      console.error('OBSIDIAN_VAULT_PATH not configured');
      process.exit(1);
    }

    this.config = {
      vaultPath,
      defaultFolder: 'MCP Notes',
      dateFormat: 'YYYY-MM-DD',
      autoTag: true,
      noteFormat: {
        includeTimestamp: true,
        template: 'default'
      }
    };
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_conversation_note',
            description: `Creates a note in Obsidian with flexible formatting styles.

**Styles available:**
- \`concise\` (default): Brief bullet points. Use for quick references, commands, syntax, or factual information.
- \`detailed\`: Full paragraphs with context. Use for concepts that need explanation or future understanding.
- \`eli5\`: Explain Like I'm 5. Simple language, analogies, no jargon. Use for complex topics that need intuitive understanding.

Choose the style based on what you're saving. Quick facts and references work better as concise. Complex concepts benefit from detailed or eli5 explanations.`,
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'Clear title summarizing the subject'
                },
                highlights: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key points to save. For concise: short phrases or single sentences. For detailed: complete explanatory paragraphs.'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to categorize the note (optional)'
                },
                folder: {
                  type: 'string',
                  description: 'Specific folder in vault to save the note (optional)'
                },
                style: {
                  type: 'string',
                  enum: ['concise', 'detailed', 'eli5'],
                  description: 'Note format style. concise: bullet points. detailed: full paragraphs. eli5: simple explanations with analogies. Default: concise',
                  default: 'concise'
                }
              },
              required: ['topic', 'highlights']
            }
          },
          {
            name: 'search_notes',
            description: `Advanced search for notes in your Obsidian vault.

**Search capabilities:**
- Search by filename, title (H1), content, or all fields
- Filter by folder/path
- Tag filtering with AND/OR logic
- Regular expression pattern matching
- Control whether to return full content or just metadata

**Examples:**
- Find notes about "machine learning" in the "Research" folder: query="machine learning", folder="Research"
- Find notes tagged with "python" OR "javascript": tags=["python", "javascript"], tagOperator="OR"
- Find notes matching regex pattern for emails: regex="[a-z0-9._%+-]+@[a-z0-9.-]+\\\\.[a-z]{2,}"
- Browse all notes in a folder: folder="Projects", includeContent=true`,
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Text to search in notes. Searches content by default unless searchIn is specified'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to filter notes by. Use tagOperator to specify AND or OR logic'
                },
                tagOperator: {
                  type: 'string',
                  enum: ['AND', 'OR'],
                  description: 'How to combine multiple tags: AND (all tags must be present) or OR (any tag can be present). Default: AND'
                },
                folder: {
                  type: 'string',
                  description: 'Folder path to filter notes. Only searches within this folder and its subfolders'
                },
                searchIn: {
                  type: 'string',
                  enum: ['filename', 'title', 'content', 'all'],
                  description: 'Where to search for the query. Default: content'
                },
                regex: {
                  type: 'string',
                  description: 'Regular expression pattern to match in content or filename. If both query and regex are provided, both must match'
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Whether to include full note content in results. Default: false (metadata only)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results. Default: 10',
                  default: 10
                },
                offset: {
                  type: 'number',
                  description: 'Number of results to skip for pagination. Default: 0',
                  default: 0
                }
              }
            }
          },
          {
            name: 'list_notes',
            description: `Browse and list all notes in your Obsidian vault with metadata.

**Features:**
- List all notes or filter by folder
- Sort by name, date modified, or size
- Pagination support for large vaults
- Optional full content inclusion

**Use cases:**
- Get an overview of all notes in a folder
- Browse recent notes (sortBy="date", sortOrder="desc")
- Find largest notes (sortBy="size", sortOrder="desc")
- Pagination for navigating large collections

**Example:**
- List 20 most recent notes: limit=20, sortBy="date", sortOrder="desc"
- Browse notes in "Projects" folder: folder="Projects"`,
            inputSchema: {
              type: 'object',
              properties: {
                folder: {
                  type: 'string',
                  description: 'Folder path to filter notes. Lists all notes if not specified'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results. Default: 50',
                  default: 50
                },
                offset: {
                  type: 'number',
                  description: 'Number of results to skip for pagination. Default: 0',
                  default: 0
                },
                sortBy: {
                  type: 'string',
                  enum: ['name', 'date', 'size'],
                  description: 'Field to sort results by. Default: name',
                  default: 'name'
                },
                sortOrder: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort order. Default: asc',
                  default: 'asc'
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Whether to include full note content. Default: false (metadata only)'
                }
              }
            }
          },
          {
            name: 'get_note_structure',
            description: 'Gets structure and content of a specific note',
            inputSchema: {
              type: 'object',
              properties: {
                note_path: {
                  type: 'string',
                  description: 'Relative path of the note in the vault'
                }
              },
              required: ['note_path']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_conversation_note':
            return await this.handleCreateConversationNote(args as unknown as ConversationNoteParams);

          case 'search_notes':
            return await this.handleSearchNotes(args as unknown as AdvancedSearchNotesParams);

          case 'list_notes':
            return await this.handleListNotes(args as unknown as ListNotesParams);

          case 'get_note_structure':
            return await this.handleGetNoteStructure(args as { note_path: string });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`
            }
          ]
        };
      }
    });
  }

  private async handleCreateConversationNote(params: ConversationNoteParams) {
    const result = await this.noteManager.createConversationNote(params);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Note created successfully!\n\n📁 Path: ${result.path}\n📝 Topic: ${params.topic}\n🏷️ Tags: ${[...(params.tags || []), 'mcp', 'ai'].join(', ')}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error creating note: ${result.error}`
          }
        ]
      };
    }
  }

  private async handleSearchNotes(params: AdvancedSearchNotesParams) {
    const results = await this.noteManager.searchNotes(params);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No notes found with the specified criteria.'
          }
        ]
      };
    }

    const header = '| # | Title | Path | Tags | Matches |';
    const separator = '|---|---|---|---|---|';
    const rows = results.map((result, index) => {
      const title = result.title || 'Untitled';
      const tags = result.tags.length > 0 ? result.tags.join(', ') : 'None';
      const matches = result.matchedFields.join(', ');
      const contentPreview = result.content ? `\n\n${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}` : '';

      return `| ${index + 1} | ${title} | ${result.path} | ${tags} | ${matches} |${contentPreview}`;
    }).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} note(s):\n\n${header}\n${separator}\n${rows}`
        }
      ]
    };
  }

  private async handleListNotes(params: ListNotesParams) {
    const result = await this.noteManager.listNotes(params);

    if (result.notes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No notes found.'
          }
        ]
      };
    }

    const header = '| # | Title | Path | Tags | Modified |';
    const separator = '|---|---|---|---|---|';
    const rows = result.notes.map((note, index) => {
      const title = note.title || 'Untitled';
      const tags = note.tags.length > 0 ? note.tags.join(', ') : 'None';
      const modified = note.lastModified.toLocaleDateString();
      const contentPreview = note.content ? `\n\n${note.content.substring(0, 300)}${note.content.length > 300 ? '...' : ''}` : '';

      return `| ${index + 1} | ${title} | ${note.path} | ${tags} | ${modified} |${contentPreview}`;
    }).join('\n');

    const pagination = result.hasMore
      ? `\n\nShowing ${result.notes.length} of ${result.total} notes. Use offset=${(params.offset || 0) + result.notes.length} for more results.`
      : `\n\nShowing all ${result.total} notes.`;

    return {
      content: [
        {
          type: 'text',
          text: `Notes in vault${pagination}\n\n${header}\n${separator}\n${rows}`
        }
      ]
    };
  }

  private async handleGetNoteStructure(params: { note_path: string }) {
    const noteStructure = await this.noteManager.getNoteStructure(params.note_path);

    if (!noteStructure) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Note not found: ${params.note_path}`
          }
        ]
      };
    }

    const summary = `📄 **${noteStructure.path}**
 🏷️ Tags: ${noteStructure.tags.join(', ') || 'None'}
 📊 Frontmatter: ${noteStructure.frontmatter ? Object.keys(noteStructure.frontmatter).join(', ') : 'None'}

---

${noteStructure.content.substring(0, 1000)}${noteStructure.content.length > 1000 ? '...' : ''}`;

    return {
      content: [
        {
          type: 'text',
          text: summary
        }
      ]
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Obsidian MCP Server started');
  }
}

const server = new ObsidianMCPServer();
server.run().catch(console.error);