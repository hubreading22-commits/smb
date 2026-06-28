/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, FolderClosed, FileText, ChevronRight, RefreshCw, LogOut, Search, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { SMBFile, UserSession } from '../types';

interface LiveFileExplorerScreenProps {
  session: UserSession;
  files: SMBFile[];
  activeShare: string;
  currentPath: string;
  isLoading: boolean;
  error: string | null;
  onLogout: () => void;
  onNavigateUp: () => void;
  onOpenFolder: (folder: SMBFile) => void;
  onSelectFileDetails: (file: SMBFile) => void;
  onDownloadFile: (file: SMBFile) => void;
  onRefresh: () => void;
}

export default function LiveFileExplorerScreen({
  session,
  files,
  activeShare,
  currentPath,
  isLoading,
  error,
  onLogout,
  onNavigateUp,
  onOpenFolder,
  onSelectFileDetails,
  onDownloadFile,
  onRefresh,
}: LiveFileExplorerScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const breadcrumb = activeShare
    ? `/${activeShare}${currentPath ? `/${currentPath}` : ''}`
    : '/';

  const visibleFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return files;
    return files.filter((file) => file.name.toLowerCase().includes(query));
  }, [files, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-slate-900 p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            {activeShare ? (
              <button
                onClick={onNavigateUp}
                className="text-slate-400 hover:text-slate-100 transition-colors"
                title="Navigate up"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8" />
            )}
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Live SMB Explorer</p>
              <h2 className="text-lg font-semibold text-white">{activeShare || 'Available Share List'}</h2>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              <FolderClosed className="w-4 h-4 text-indigo-400" />
              <span>Current path</span>
            </div>
            <p className="mt-2 text-sm text-slate-200 font-mono break-all">{breadcrumb}</p>
            <p className="mt-2 text-[11px] text-slate-500">Signed in as <span className="text-slate-300 font-semibold">{session.username}</span></p>
          </div>
        </div>

        <div className="flex flex-col gap-3 shrink-0">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-3 text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search current view..."
            className="w-full bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-500 font-mono"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-700 bg-rose-950/60 p-4 text-sm text-rose-200">
            <p className="font-semibold">Unable to load content</p>
            <p className="mt-1 text-slate-300">{error}</p>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 shadow-inner p-3">
          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading SMB directory...
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-slate-500 gap-3">
              <p className="text-sm font-medium">No items found in this location.</p>
              <p className="text-xs text-slate-400">Navigate between shares or refresh to see live SMB entries.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleFiles.map((file) => {
                const isFolder = file.type === 'folder';
                return (
                  <button
                    key={file.id}
                    onClick={() => (isFolder ? onOpenFolder(file) : onSelectFileDetails(file))}
                    className="group w-full rounded-3xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-indigo-500/40 hover:bg-slate-900/95"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-3xl flex items-center justify-center ${isFolder ? 'bg-amber-950 text-amber-400' : 'bg-sky-950 text-sky-400'}`}>
                          {isFolder ? <FolderClosed className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100 truncate">{file.name}</span>
                            {isFolder && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">Folder</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{isFolder ? 'Open folder' : `${(file.size / 1024).toFixed(1)} KB`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        {!isFolder && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDownloadFile(file);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] transition hover:border-slate-700 hover:bg-slate-900"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
