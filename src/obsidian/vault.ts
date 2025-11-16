import fs from 'fs-extra';
import path from 'path';
import { MCPConfig } from '../types/index.js';

export class VaultManager {
  private config: MCPConfig;

  constructor(config: MCPConfig) {
    this.config = config;
  }

  validateVaultPath(): boolean {
    return fs.existsSync(this.config.vaultPath) && 
           fs.statSync(this.config.vaultPath).isDirectory();
  }

  ensureFolderExists(folderPath: string): void {
    const fullPath = path.join(this.config.vaultPath, folderPath);
    fs.ensureDirSync(fullPath);
  }

  getFullPath(relativePath: string): string {
    return path.join(this.config.vaultPath, relativePath);
  }

  sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  generateFileName(topic: string, date: Date): string {
    const sanitizedTopic = this.sanitizeFileName(topic);
    const dateStr = date.toISOString().split('T')[0];
    return `${dateStr} - ${sanitizedTopic}.md`;
  }

  async fileExists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async listFiles(folder: string = '', extension: string = '.md'): Promise<string[]> {
    const folderPath = path.join(this.config.vaultPath, folder);
    
    if (!fs.existsSync(folderPath)) {
      return [];
    }

    const files: string[] = [];
    const items = await fs.readdir(folderPath);

    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        const subFiles = await this.listFiles(path.join(folder, item), extension);
        files.push(...subFiles);
      } else if (item.endsWith(extension)) {
        files.push(path.join(folder, item));
      }
    }

    return files;
  }
}