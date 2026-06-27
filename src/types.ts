/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SMBFile {
  id: string;
  name: string;
  path: string; // Full virtual path e.g. "Public_Share/Documents/notes.txt"
  type: 'file' | 'folder';
  size: number; // in bytes (0 for folders)
  updatedAt: string; // ISO date string
  extension?: string; // file extension (e.g., "txt", "pdf", "png")
  owner: string; // creator or domain owner
  
  // Simulated permissions
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canRename: boolean;
  };
  
  // Simulated content for previewing
  content?: string;
  mimeType?: string;
}

export interface UserSession {
  username: string; // DOMAIN\username format
  domain: string;
  shortUsername: string;
  role: 'admin' | 'employee' | 'guest';
  loginTime: string;
}

export interface SMBServerConfig {
  host: string;
  port: number;
  protocol: string;
}

export type SortField = 'name' | 'size' | 'updatedAt' | 'type';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid';

export interface SMBLogEntry {
  timestamp: string;
  type: 'CONNECT' | 'AUTH' | 'TREE_CONNECT' | 'READ' | 'WRITE' | 'CREATE' | 'DELETE' | 'RENAME';
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  message: string;
}
