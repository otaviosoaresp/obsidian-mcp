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
import { MCPConfig, ConversationNoteParams, SearchNotesParams } from './types/index.js';

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
        includeContext: true,
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
            description: 'Creates a note in Obsidian from a conversation',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'Main topic of the conversation'
                },
                highlights: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of important points from the conversation'
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
                context: {
                  type: 'string',
                  description: 'Additional context of the conversation (optional)'
                }
              },
              required: ['topic', 'highlights']
            }
          },
          {
            name: 'search_notes',
            description: 'Searches existing notes in the vault',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Text to search in note contents (optional)'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to filter the notes (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                  default: 10
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
            return await this.handleSearchNotes(args as unknown as SearchNotesParams);

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

  private async handleSearchNotes(params: SearchNotesParams) {
    const results = await this.noteManager.searchNotes(
      params.query,
      params.tags,
      params.limit || 10
    );

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

    const resultsText = results.map((file, index) => {
      return `${index + 1}. ${file}`;
    }).join('\n');

    return {
      content: [
        {
          type: 'text',
            text: `📝 Notes found (${results.length}):\n\n${resultsText}`
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