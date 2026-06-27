/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Eye, Download, Edit2, Trash2, Info, Lock, ShieldCheck, FileText, FolderClosed } from 'lucide-react';
import { SMBFile } from '../types';

interface FileDetailBottomSheetProps {
  file: SMBFile;
  onClose: () => void;
  onOpen: (file: SMBFile) => void;
  onDownload: (file: SMBFile) => void;
  onRename: (file: SMBFile) => void;
  onDelete: (file: SMBFile) => void;
}

export default function FileDetailBottomSheet({
  file,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: FileDetailBottomSheetProps) {
  const isFolder = file.type === 'folder';

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center select-none">
      {/* Dimmed background click closes sheet */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full bg-slate-900 border-t border-slate-800 rounded-t-[28px] p-5 pb-6 space-y-4 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200">
        
        {/* Handle bar */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto" />

        {/* Header details */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isFolder ? 'bg-amber-950/40 text-amber-500 border border-amber-900/30' : 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30'
            }`}>
              {isFolder ? <FolderClosed className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 line-clamp-1 break-all">{file.name}</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                \\192.168.1.50\{file.path.replace(/\//g, '\\')}
              </p>
            </div>
          </div>
          <button
            id="close-details-sheet"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SMB ACL Permissions Indicator */}
        <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>SMB Security Descriptor (ACL)</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
            <div className="text-center p-1 rounded bg-slate-900 border border-slate-800">
              <span className="block text-slate-500 text-[8px] uppercase">Read</span>
              <span className={file.permissions.canRead ? "text-emerald-400 font-bold" : "text-rose-500 font-bold"}>
                {file.permissions.canRead ? "ALLOW" : "DENY"}
              </span>
            </div>
            <div className="text-center p-1 rounded bg-slate-900 border border-slate-800">
              <span className="block text-slate-500 text-[8px] uppercase">Write</span>
              <span className={file.permissions.canWrite ? "text-emerald-400 font-bold" : "text-rose-500 font-bold"}>
                {file.permissions.canWrite ? "ALLOW" : "DENY"}
              </span>
            </div>
            <div className="text-center p-1 rounded bg-slate-900 border border-slate-800">
              <span className="block text-slate-500 text-[8px] uppercase">Rename</span>
              <span className={file.permissions.canRename ? "text-emerald-400 font-bold" : "text-rose-500 font-bold"}>
                {file.permissions.canRename ? "ALLOW" : "DENY"}
              </span>
            </div>
            <div className="text-center p-1 rounded bg-slate-900 border border-slate-800">
              <span className="block text-slate-500 text-[8px] uppercase">Delete</span>
              <span className={file.permissions.canDelete ? "text-emerald-400 font-bold" : "text-rose-500 font-bold"}>
                {file.permissions.canDelete ? "ALLOW" : "DENY"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions list */}
        <div className="space-y-1">
          {!isFolder && (
            <button
              id="sheet-action-open"
              onClick={() => {
                onOpen(file);
                onClose();
              }}
              className="w-full text-left px-4 py-3 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Open & Preview</span>
            </button>
          )}

          {!isFolder && (
            <button
              id="sheet-action-download"
              onClick={() => {
                onDownload(file);
                onClose();
              }}
              className="w-full text-left px-4 py-3 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Download File</span>
            </button>
          )}

          <button
            id="sheet-action-rename"
            onClick={() => {
              onRename(file);
              onClose();
            }}
            disabled={!file.permissions.canRename}
            className={`w-full text-left px-4 py-3 text-xs font-semibold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
              file.permissions.canRename 
                ? 'text-slate-200 hover:text-white hover:bg-slate-800' 
                : 'text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Edit2 className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span>Rename {isFolder ? 'Folder' : 'File'}</span>
              {!file.permissions.canRename && <Lock className="w-3.5 h-3.5 text-slate-500" />}
            </div>
          </button>

          <button
            id="sheet-action-delete"
            onClick={() => {
              onDelete(file);
              onClose();
            }}
            disabled={!file.permissions.canDelete}
            className={`w-full text-left px-4 py-3 text-xs font-semibold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
              file.permissions.canDelete 
                ? 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/20' 
                : 'text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span>Delete {isFolder ? 'Folder' : 'File'}</span>
              {!file.permissions.canDelete && <Lock className="w-3.5 h-3.5 text-slate-500" />}
            </div>
          </button>
        </div>

        {/* Detailed file information block */}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>File Attributes</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono text-slate-400 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
            <div>
              <span className="block text-slate-500">Size</span>
              <span className="text-slate-200">{isFolder ? '—' : `${(file.size / 1024).toFixed(2)} KB (${file.size} bytes)`}</span>
            </div>
            <div>
              <span className="block text-slate-500">Owner</span>
              <span className="text-slate-200 truncate block">{file.owner}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-slate-500">Last Modified</span>
              <span className="text-slate-200">{new Date(file.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
