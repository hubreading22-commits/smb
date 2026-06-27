/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Menu,
  Grid,
  List,
  ArrowUpDown,
  Search,
  Plus,
  FolderPlus,
  Upload,
  FolderClosed,
  FileText,
  ChevronRight,
  MoreVertical,
  LogOut,
  RefreshCw,
  X,
  Lock,
  ArrowLeft,
  Settings,
  ShieldAlert,
  HardDrive,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SMBFile, UserSession, SortField, SortOrder, ViewMode } from '../types';

interface FileExplorerScreenProps {
  session: UserSession;
  files: SMBFile[];
  onLogout: () => void;
  onUpdateFiles: (newFiles: SMBFile[]) => void;
  onLogEntry: (type: 'TREE_CONNECT' | 'READ' | 'WRITE' | 'CREATE' | 'DELETE' | 'RENAME', status: 'SUCCESS' | 'FAILURE' | 'PENDING', message: string) => void;
  onSelectFileDetails: (file: SMBFile) => void;
  onOpenFileViewer: (file: SMBFile) => void;
  onDownloadFile: (file: SMBFile) => void;
}

export default function FileExplorerScreen({
  session,
  files,
  onLogout,
  onUpdateFiles,
  onLogEntry,
  onSelectFileDetails,
  onOpenFileViewer,
  onDownloadFile,
}: FileExplorerScreenProps) {
  // Navigation states
  const [currentPath, setCurrentPath] = useState<string>(''); // empty string means root / list of shares
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sortField, setSortField] = useState<SortField>('type');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drawer & UI Dialog states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  
  // Dynamic action targets
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<SMBFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SMBFile | null>(null);

  // References for file uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current active directory permissions (write is required for create/upload)
  const getCurrentDirectoryPermissions = () => {
    if (currentPath === '') {
      // Top-level / root directory. No one can create folders/files at root share directly, only inside shares.
      return { canWrite: false };
    }
    // Find the share item of the current path (e.g., if path is 'Public_Share/Documents', share is 'Public_Share')
    const shareName = currentPath.split('/')[0];
    const shareFile = files.find(f => f.path === shareName && f.type === 'folder');
    return shareFile ? shareFile.permissions : { canWrite: false };
  };

  const currentDirPerms = getCurrentDirectoryPermissions();

  // Filter and sort files in the current directory level
  const getContentsOfPath = () => {
    let list: SMBFile[] = [];
    if (currentPath === '') {
      list = files.filter(f => !f.path.includes('/'));
    } else {
      const prefix = currentPath + '/';
      list = files.filter(f => {
        if (!f.path.startsWith(prefix)) return false;
        const relativePath = f.path.substring(prefix.length);
        return !relativePath.includes('/');
      });
    }

    // Apply search filter if active
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }

    // Apply Sorting
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'size') {
        comparison = a.size - b.size;
      } else if (sortField === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const activeContents = getContentsOfPath();

  // Folder navigation handler
  const handleFolderClick = (folder: SMBFile) => {
    onLogEntry('TREE_CONNECT', 'PENDING', `SMB Tree Connect: Connecting to \\\\192.168.1.50\\${folder.path.replace(/\//g, '\\')}...`);
    
    setTimeout(() => {
      setCurrentPath(folder.path);
      setSearchQuery('');
      setIsFabExpanded(false);
      onLogEntry('TREE_CONNECT', 'SUCCESS', `Connected to share folder: ${folder.name}. Permissions synchronized.`);
    }, 300);
  };

  // Navigating up (Back action)
  const handleNavigateUp = () => {
    if (currentPath === '') return;
    const parts = currentPath.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    setCurrentPath(parentPath);
    setSearchQuery('');
    setIsFabExpanded(false);
    onLogEntry('READ', 'SUCCESS', `Navigated back to ${parentPath || 'Root shares'}`);
  };

  // Handle Pull-to-refresh
  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    onLogEntry('READ', 'PENDING', `Refreshing SMB3 share index for \\\\192.168.1.50\\${currentPath}...`);
    
    setTimeout(() => {
      setIsRefreshing(false);
      onLogEntry('READ', 'SUCCESS', `Successfully indexed ${activeContents.length} files/directories.`);
    }, 1000);
  };

  // Create Folder action
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    if (!currentDirPerms.canWrite) {
      onLogEntry('WRITE', 'FAILURE', `Permission Denied: Write access is blocked on this directory path.`);
      return;
    }

    const newPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();
    
    // Check if folder name already exists
    if (files.some(f => f.path.toLowerCase() === newPath.toLowerCase())) {
      alert('A file or folder with that name already exists in this directory.');
      return;
    }

    const newFolderItem: SMBFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: newFolderName.trim(),
      path: newPath,
      type: 'folder',
      size: 0,
      updatedAt: new Date().toISOString(),
      owner: session.username,
      permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true }
    };

    onLogEntry('CREATE', 'PENDING', `SMB Create Request: Allocating directory node for '${newFolderName}'...`);
    
    setTimeout(() => {
      onUpdateFiles([...files, newFolderItem]);
      setNewFolderName('');
      setIsCreateFolderOpen(false);
      setIsFabExpanded(false);
      onLogEntry('CREATE', 'SUCCESS', `Directory created successfully: ${newFolderName}`);
    }, 600);
  };

  // File Upload emulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!currentDirPerms.canWrite) {
      onLogEntry('WRITE', 'FAILURE', `Access Denied: You do not have write permissions to upload files here.`);
      return;
    }

    const ext = uploadedFile.name.split('.').pop() || 'dat';
    const finalPath = currentPath ? `${currentPath}/${uploadedFile.name}` : uploadedFile.name;

    // Simulate reading text files if text-based, else generate simple dummy text
    let dummyContent = `Simulated upload binary payload of ${uploadedFile.name}`;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const textResult = event.target?.result;
      if (typeof textResult === 'string') {
        dummyContent = textResult;
      }

      const newFileItem: SMBFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: uploadedFile.name,
        path: finalPath,
        type: 'file',
        size: uploadedFile.size,
        updatedAt: new Date().toISOString(),
        extension: ext,
        owner: session.username,
        permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
        content: dummyContent
      };

      onLogEntry('WRITE', 'PENDING', `SMB Write: Sending block chunks for '${uploadedFile.name}' (${(uploadedFile.size / 1024).toFixed(1)} KB)...`);
      
      setTimeout(() => {
        onUpdateFiles([...files, newFileItem]);
        setIsFabExpanded(false);
        onLogEntry('WRITE', 'SUCCESS', `File written and locked: \\\\192.168.1.50\\${finalPath.replace(/\//g, '\\')}`);
      }, 800);
    };

    if (uploadedFile.type.startsWith('text/') || ext === 'txt' || ext === 'csv' || ext === 'json' || ext === 'ini' || ext === 'ps1') {
      reader.readAsText(uploadedFile);
    } else {
      // Fake non-text image uploads with a gorgeous visual source
      const randomImages = [
        'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop'
      ];
      const randomPic = randomImages[Math.floor(Math.random() * randomImages.length)];
      
      const newFileItem: SMBFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: uploadedFile.name,
        path: finalPath,
        type: 'file',
        size: uploadedFile.size,
        updatedAt: new Date().toISOString(),
        extension: ext,
        owner: session.username,
        permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
        content: isImageFile(ext) ? randomPic : dummyContent
      };

      onLogEntry('WRITE', 'PENDING', `SMB Write: Spooling payload for non-text file '${uploadedFile.name}'...`);
      setTimeout(() => {
        onUpdateFiles([...files, newFileItem]);
        setIsFabExpanded(false);
        onLogEntry('WRITE', 'SUCCESS', `File upload complete: \\\\192.168.1.50\\${finalPath.replace(/\//g, '\\')}`);
      }, 800);
    }
  };

  const isImageFile = (ext?: string) => {
    if (!ext) return false;
    return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext.toLowerCase());
  };

  // Rename File action
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    if (!renameTarget.permissions.canRename) {
      onLogEntry('RENAME', 'FAILURE', `Access Denied: You do not have permissions to rename this file.`);
      return;
    }

    const oldName = renameTarget.name;
    const oldPath = renameTarget.path;
    const parentParts = oldPath.split('/');
    parentParts.pop();
    const newPath = parentParts.length > 0 ? `${parentParts.join('/')}/${renameValue.trim()}` : renameValue.trim();

    onLogEntry('RENAME', 'PENDING', `SMB Rename: Changing node name from '${oldName}' to '${renameValue.trim()}'...`);

    setTimeout(() => {
      // Update the file itself and any children files if it was a folder!
      const updatedFiles = files.map(f => {
        if (f.id === renameTarget.id) {
          return {
            ...f,
            name: renameValue.trim(),
            path: newPath,
            updatedAt: new Date().toISOString()
          };
        }
        // If it was a folder rename, update any sub-files path prefixes!
        if (renameTarget.type === 'folder' && f.path.startsWith(oldPath + '/')) {
          const relativePart = f.path.substring(oldPath.length);
          return {
            ...f,
            path: newPath + relativePart
          };
        }
        return f;
      });

      onUpdateFiles(updatedFiles);
      setRenameTarget(null);
      setRenameValue('');
      setIsRenameOpen(false);
      onLogEntry('RENAME', 'SUCCESS', `Successfully renamed '${oldName}' to '${renameValue.trim()}'`);
    }, 600);
  };

  // Delete File action
  const handleDeleteSubmit = () => {
    if (!deleteTarget) return;

    if (!deleteTarget.permissions.canDelete) {
      onLogEntry('DELETE', 'FAILURE', `Access Denied: You do not have permission to delete this file/folder.`);
      return;
    }

    onLogEntry('DELETE', 'PENDING', `SMB Delete: Removing node for \\\\192.168.1.50\\${deleteTarget.path.replace(/\//g, '\\')}...`);

    setTimeout(() => {
      // Remove the file itself, and any subfiles if it's a folder
      const updatedFiles = files.filter(f => {
        if (f.id === deleteTarget.id) return false;
        if (deleteTarget.type === 'folder' && f.path.startsWith(deleteTarget.path + '/')) return false;
        return true;
      });

      onUpdateFiles(updatedFiles);
      setDeleteTarget(null);
      setIsDeleteOpen(false);
      onLogEntry('DELETE', 'SUCCESS', `Deleted item '${deleteTarget.name}' and all associated nodes.`);
    }, 600);
  };

  const getBreadcrumbs = () => {
    if (currentPath === '') return [{ name: 'Shares (Root)', path: '' }];
    const parts = currentPath.split('/');
    const crumbs = [{ name: 'Shares', path: '' }];
    let accum = '';
    parts.forEach((p, idx) => {
      accum = accum === '' ? p : `${accum}/${p}`;
      crumbs.push({ name: p, path: accum });
    });
    return crumbs;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden relative">
      
      {/* Search overlay/Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-2 z-20 shrink-0 select-none">
        
        {isSearching ? (
          <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              id="explorer-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search current folder..."
              className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full"
              autoFocus
            />
            <button
              id="clear-search"
              onClick={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Standard Bar */}
            <div className="flex items-center gap-3 select-none">
              <button
                id="drawer-toggle"
                onClick={() => setIsDrawerOpen(true)}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5 text-slate-300" />
              </button>
              <div>
                <h1 className="text-sm font-bold tracking-wide flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  <span>192.168.1.50</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">
                  {session.shortUsername} ({session.role})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Search Toggle */}
              <button
                id="search-toggle"
                onClick={() => setIsSearching(true)}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                title="Search Files"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* View mode toggle */}
              <button
                id="view-mode-toggle"
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                title={viewMode === 'list' ? "Switch to Grid View" : "Switch to List View"}
              >
                {viewMode === 'list' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>

              {/* Sort action */}
              <button
                id="sort-toggle"
                onClick={() => {
                  // Cycle sort: type -> name -> size -> updatedAt
                  if (sortField === 'type') setSortField('name');
                  else if (sortField === 'name') setSortField('size');
                  else if (sortField === 'size') setSortField('updatedAt');
                  else {
                    setSortField('type');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }
                }}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white flex items-center gap-0.5"
                title={`Sorting by ${sortField}`}
              >
                <ArrowUpDown className="w-4 h-4 text-indigo-400" />
                <span className="text-[9px] font-bold font-mono uppercase text-indigo-400">{sortField.substring(0, 3)}</span>
              </button>

              {/* Refresh */}
              <button
                id="refresh-btn"
                onClick={handleRefresh}
                className={`p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
                title="Pull to Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Breadcrumb breadcrumbs trail */}
      <div className="bg-slate-950/40 px-4 py-2 border-b border-slate-800 flex items-center gap-1 overflow-x-auto whitespace-nowrap shrink-0 text-[11px] scrollbar-none scroll-smooth">
        {currentPath !== '' && (
          <button
            id="back-breadcrumb-btn"
            onClick={handleNavigateUp}
            className="p-1 hover:bg-slate-800 rounded-lg text-indigo-400 transition-colors mr-1 cursor-pointer shrink-0"
            title="Up one level"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
        
        {getBreadcrumbs().map((crumb, idx, arr) => (
          <React.Fragment key={crumb.path}>
            <button
              id={`crumb-${idx}`}
              onClick={() => {
                if (crumb.path !== currentPath) {
                  onLogEntry('TREE_CONNECT', 'PENDING', `Navigating to \\\\192.168.1.50\\${crumb.path}...`);
                  setCurrentPath(crumb.path);
                  setSearchQuery('');
                  onLogEntry('READ', 'SUCCESS', `Navigated to ${crumb.name || 'Root'}`);
                }
              }}
              className={`hover:underline font-mono ${
                idx === arr.length - 1 ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {crumb.name}
            </button>
            {idx < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Directory Contents viewport */}
      <div className="flex-1 overflow-y-auto px-4 py-3 relative min-h-0">
        
        {/* Loading state simulator */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs text-indigo-400 shadow-xl">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="font-semibold">Querying Active SMB Share...</span>
            </div>
          </div>
        )}

        {/* Empty Directory State */}
        {activeContents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
            <FolderClosed className="w-10 h-10 text-slate-700 mb-2" />
            <span className="text-xs font-semibold">No Files or Folders</span>
            <p className="text-[10px] text-slate-600 max-w-[200px] mt-1">
              {searchQuery ? 'Try altering your search term.' : 'This SMB share directory is empty.'}
            </p>
          </div>
        )}

        {/* Layout list / grid rendering */}
        {viewMode === 'list' ? (
          /* LIST VIEW */
          <div className="space-y-1">
            {activeContents.map((item) => (
              <div
                id={`item-row-${item.id}`}
                key={item.id}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 active:bg-slate-800 border border-transparent hover:border-slate-800/40 transition-all cursor-pointer select-none"
                onClick={() => {
                  if (item.type === 'folder') {
                    handleFolderClick(item);
                  } else {
                    onOpenFileViewer(item);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'folder' 
                      ? 'bg-amber-950/30 text-amber-500 border border-amber-900/10' 
                      : 'bg-indigo-950/30 text-indigo-400 border border-indigo-900/10'
                  }`}>
                    {item.type === 'folder' ? <FolderClosed className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-200 truncate block group-hover:text-white">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                      {item.type === 'file' && (
                        <>
                          <span>{(item.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Lock badge if they don't have write access */}
                  {!item.permissions.canWrite && item.type === 'folder' && (
                    <Lock className="w-3 h-3 text-slate-600 mr-1" title="Read Only Share" />
                  )}
                  <button
                    id={`options-btn-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFileDetails(item);
                    }}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
                    title="File Options Menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-2 gap-3">
            {activeContents.map((item) => (
              <div
                id={`item-card-${item.id}`}
                key={item.id}
                className="group p-3 bg-slate-950/20 hover:bg-slate-800/40 active:bg-slate-800 rounded-2xl border border-slate-800/40 hover:border-slate-800 flex flex-col justify-between h-28 cursor-pointer transition-all relative"
                onClick={() => {
                  if (item.type === 'folder') {
                    handleFolderClick(item);
                  } else {
                    onOpenFileViewer(item);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'folder' 
                      ? 'bg-amber-950/30 text-amber-500 border border-amber-900/10' 
                      : 'bg-indigo-950/30 text-indigo-400 border border-indigo-900/10'
                  }`}>
                    {item.type === 'folder' ? <FolderClosed className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    {!item.permissions.canWrite && item.type === 'folder' && (
                      <Lock className="w-3 h-3 text-slate-600 mr-0.5" title="Read Only" />
                    )}
                    <button
                      id={`options-grid-btn-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFileDetails(item);
                      }}
                      className="p-1 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate block group-hover:text-white">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono mt-0.5">
                    {item.type === 'file' ? (
                      <span>{(item.size / 1024).toFixed(0)} KB</span>
                    ) : (
                      <span>Folder</span>
                    )}
                    <span>•</span>
                    <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button for Create/Upload */}
      {currentPath !== '' && (
        <div className="absolute bottom-5 right-5 z-20 flex flex-col items-end gap-3 select-none">
          {/* Speed dial selections */}
          <AnimatePresence>
            {isFabExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="flex flex-col gap-2 mb-1"
              >
                {/* Upload Action */}
                <button
                  id="fab-upload-file"
                  onClick={() => {
                    if (!currentDirPerms.canWrite) {
                      onLogEntry('WRITE', 'FAILURE', `Access Denied: Read-only access limits writing files.`);
                      alert('Access Denied: You do not have write permissions to upload files here.');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className={`flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl px-3.5 py-2.5 shadow-lg text-xs cursor-pointer transition-colors ${
                    !currentDirPerms.canWrite ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload File</span>
                </button>

                {/* Create Folder Action */}
                <button
                  id="fab-create-folder"
                  onClick={() => {
                    if (!currentDirPerms.canWrite) {
                      onLogEntry('WRITE', 'FAILURE', `Access Denied: Read-only access limits creating directories.`);
                      alert('Access Denied: You do not have permissions to create folders here.');
                      return;
                    }
                    setIsCreateFolderOpen(true);
                  }}
                  className={`flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl px-3.5 py-2.5 shadow-lg text-xs cursor-pointer transition-colors ${
                    !currentDirPerms.canWrite ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FolderPlus className="w-4 h-4 text-amber-500" />
                  <span>New Folder</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary FAB */}
          <button
            id="fab-toggle"
            onClick={() => setIsFabExpanded(!isFabExpanded)}
            className="w-13 h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 transition-all cursor-pointer border border-indigo-400/25"
          >
            <Plus className={`w-6 h-6 transition-transform duration-250 ${isFabExpanded ? 'rotate-45' : ''}`} />
          </button>
        </div>
      )}

      {/* Hidden File Input element */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        id="explorer-hidden-upload"
      />

      {/* Left Navigation Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="absolute inset-0 z-50 flex select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black"
            />

            {/* Content Drawer Box */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="w-[280px] bg-slate-900 border-r border-slate-800 h-full relative z-10 flex flex-col justify-between p-5"
            >
              <div className="space-y-6">
                {/* Profile detail */}
                <div className="border-b border-slate-800 pb-4">
                  <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white mb-2">
                    {session.shortUsername.substring(0, 2).toUpperCase()}
                  </div>
                  <h2 className="text-xs font-bold text-slate-100 font-mono truncate">{session.username}</h2>
                  <span className="bg-slate-950 text-[9px] text-emerald-400 border border-slate-800 font-mono font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                    {session.role} ROLE
                  </span>
                </div>

                {/* Share Quick list */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">SMB Active Shares</span>
                  <div className="space-y-1">
                    {files.filter(f => f.type === 'folder' && !f.path.includes('/')).map((share) => (
                      <button
                        id={`drawer-share-${share.id}`}
                        key={share.id}
                        onClick={() => {
                          onLogEntry('TREE_CONNECT', 'PENDING', `SMB Tree Connect: Navigating to \\\\192.168.1.50\\${share.path}...`);
                          setCurrentPath(share.path);
                          setSearchQuery('');
                          setIsDrawerOpen(false);
                          onLogEntry('TREE_CONNECT', 'SUCCESS', `Connected to share ${share.name}`);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
                          currentPath.split('/')[0] === share.path 
                            ? 'bg-indigo-650/40 text-indigo-400 border border-indigo-900/30' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <FolderClosed className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate font-mono">/{share.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connection metadata stats */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Active Session Data</span>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[9px] font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Dialect:</span>
                      <span className="text-emerald-400">SMB 3.1.1</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Signing:</span>
                      <span className="text-slate-300">AES-128-GMAC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Port:</span>
                      <span className="text-slate-300">445 (TCP)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Server Host:</span>
                      <span className="text-slate-300">192.168.1.50</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout Area */}
              <div className="border-t border-slate-800 pt-4">
                <button
                  id="drawer-logout-btn"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer font-semibold"
                >
                  <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>Close Connection</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE FOLDER MODAL */}
      <AnimatePresence>
        {isCreateFolderOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2 text-indigo-400">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Create Folder</h3>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-3.5">
                <input
                  id="folder-input-name"
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-950 border focus:border-indigo-500 border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                  autoFocus
                  required
                />
                <div className="flex gap-2 justify-end text-xs font-semibold">
                  <button
                    id="cancel-folder-btn"
                    type="button"
                    onClick={() => setIsCreateFolderOpen(false)}
                    className="px-3 py-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-folder-btn"
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENAME MODAL */}
      <AnimatePresence>
        {isRenameOpen && renameTarget && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2 text-amber-500">
                <HardDrive className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-100">Rename Item</h3>
              </div>

              <form onSubmit={handleRenameSubmit} className="space-y-3.5">
                <input
                  id="rename-input-name"
                  type="text"
                  placeholder="New name"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full bg-slate-950 border focus:border-amber-500 border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                  autoFocus
                  required
                />
                <div className="flex gap-2 justify-end text-xs font-semibold">
                  <button
                    id="cancel-rename-btn"
                    type="button"
                    onClick={() => {
                      setIsRenameOpen(false);
                      setRenameTarget(null);
                    }}
                    className="px-3 py-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-rename-btn"
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    Rename
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {isDeleteOpen && deleteTarget && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2 text-rose-500">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-slate-100">Delete Item?</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to delete <span className="font-mono text-slate-200 font-bold break-all">'{deleteTarget.name}'</span>? This action is permanent and will delete any contents inside!
              </p>

              <div className="flex gap-2 justify-end text-xs font-semibold pt-1">
                <button
                  id="cancel-delete-btn"
                  type="button"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setDeleteTarget(null);
                  }}
                  className="px-3 py-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-btn"
                  onClick={handleDeleteSubmit}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Triggers for sub modals directly referenced by bottom sheet actions */}
      <div className="hidden">
        <button id="trigger-rename-action" onClick={() => {
          if (renameTarget) {
            setRenameValue(renameTarget.name);
            setIsRenameOpen(true);
          }
        }} />
        <button id="trigger-delete-action" onClick={() => {
          if (deleteTarget) {
            setIsDeleteOpen(true);
          }
        }} />
      </div>
    </div>
  );
}
