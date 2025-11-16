# Obsidian MCP Server

A Model Context Protocol (MCP) server for managing Obsidian vault notes through AI conversations. This server enables AI assistants to create, search, and analyze notes in your Obsidian vault seamlessly.

## Features

- ✅ **Create notes from conversations** - Automatically generate structured notes from AI conversations
- ✅ **Search notes by content and tags** - Find existing notes using full-text search and tag filtering
- ✅ **Get note structure and metadata** - Retrieve detailed information about specific notes
- ✅ **Automatic frontmatter formatting** - Notes include proper YAML frontmatter with metadata
- ✅ **Folder organization** - Organize notes in custom folders within your vault
- ✅ **Timestamp tracking** - Automatic creation and modification timestamps
- ✅ **Tag management** - Automatic tagging with customizable tags

## Prerequisites

- Node.js 18+ 
- An Obsidian vault
- MCP-compatible AI client (Claude Desktop, etc.)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd obsidian-mcp

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Configuration

### Method 1: Environment Variable (Recommended)

Set the path to your Obsidian vault:

```bash
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to make it permanent.

### Method 2: Configuration File

Edit `config/default.json`:

```json
{
  "vaultPath": "/path/to/your/vault",
  "defaultFolder": "MCP Notes",
  "dateFormat": "YYYY-MM-DD",
  "autoTag": true,
  "noteFormat": {
    "includeTimestamp": true,
    "includeContext": true,
    "template": "default"
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `vaultPath` | string | - | **Required**. Path to your Obsidian vault |
| `defaultFolder` | string | "MCP Notes" | Default folder for new notes |
| `dateFormat` | string | "YYYY-MM-DD" | Date format for timestamps |
| `autoTag` | boolean | true | Automatically add default tags |
| `noteFormat.includeTimestamp` | boolean | true | Include creation timestamp |
| `noteFormat.includeContext` | boolean | true | Include context section |
| `noteFormat.template` | string | "default" | Note template to use |

## Usage

### With AI Assistants

Use natural language commands like:

- "Create a note from our conversation about machine learning, highlight only the key points"
- "Search my vault for notes about web development"
- "Show me the content of the note about project planning"
- "Find all notes tagged with 'python' or 'programming'"

### Available Tools

#### 1. `create_conversation_note`
Creates a structured note from conversation content.

**Parameters:**
- `topic` (string, required) - Main topic of the conversation
- `highlights` (array, required) - List of important points from the conversation
- `tags` (array, optional) - Additional tags to categorize the note
- `folder` (string, optional) - Specific folder in vault to save the note
- `context` (string, optional) - Additional context about the conversation

**Example:**
```json
{
  "topic": "Machine Learning Fundamentals",
  "highlights": [
    "Supervised learning requires labeled data",
    "Neural networks mimic brain structure",
    "Feature engineering is crucial for model performance"
  ],
  "tags": ["ml", "ai", "fundamentals"],
  "folder": "Learning/ML"
}
```

#### 2. `search_notes`
Searches for existing notes in the vault.

**Parameters:**
- `query` (string, optional) - Text to search in note contents
- `tags` (array, optional) - Tags to filter notes by
- `limit` (number, optional) - Maximum number of results (default: 10)

**Example:**
```json
{
  "query": "neural networks",
  "tags": ["ml", "deep-learning"],
  "limit": 5
}
```

#### 3. `get_note_structure`
Retrieves detailed information about a specific note.

**Parameters:**
- `note_path` (string, required) - Relative path of the note in the vault

**Example:**
```json
{
  "note_path": "MCP Notes/machine-learning-fundamentals.md"
}
```

## Note Format

Generated notes follow this structured format:

```markdown
---
created: "2025-11-16"
context: "AI Conversation"
tags: ["machine-learning", "mcp", "ai"]
---

# Machine Learning Fundamentals

## Key Points
1. Supervervised learning requires labeled data
2. Neural networks mimic brain structure
3. Feature engineering is crucial for model performance

## Discussion Context
Additional context about the learning session and topics covered.

---
*Generated via MCP on 11/16/2025 14:30*
```

## MCP Client Setup

Add this server to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/path/to/obsidian-mcp/dist/server.js"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

## Development

```bash
# Development with watch mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Start the server
npm start
```

## Project Structure

```
obsidian-mcp/
├── src/
│   ├── server.ts          # Main MCP server
│   ├── obsidian/
│   │   ├── vault.ts       # Vault management
│   │   ├── note.ts        # Note operations
│   │   └── formatter.ts   # Content formatting
│   └── types/
│       └── index.ts       # TypeScript types
├── config/
│   └── default.json       # Default configuration
├── dist/                  # Compiled JavaScript
├── node_modules/          # Dependencies
├── package.json           # Project metadata
├── tsconfig.json          # TypeScript configuration
└── README.md
```

## Troubleshooting

### Common Issues

1. **"OBSIDIAN_VAULT_PATH not configured"**
   - Ensure the environment variable is set or update config/default.json

2. **"Vault not found"**
   - Verify the vault path is correct and accessible
   - Check file permissions

3. **"Permission denied"**
   - Ensure the server has read/write access to your vault
   - Check folder permissions

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=obsidian-mcp:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.