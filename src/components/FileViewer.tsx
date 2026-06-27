/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Download, FileText, Image, FileCode, Database, Eye } from 'lucide-react';
import { SMBFile } from '../types';

interface FileViewerProps {
  file: SMBFile;
  onClose: () => void;
  onDownload: (file: SMBFile) => void;
}

export default function FileViewer({ file, onClose, onDownload }: FileViewerProps) {
  const isImage = file.extension === 'png' || file.extension === 'jpg' || file.extension === 'jpeg';
  const isCsv = file.extension === 'csv';
  const isJson = file.extension === 'json';
  const isCode = file.extension === 'ps1' || file.extension === 'ini';

  const renderContent = () => {
    if (isImage) {
      if (file.content?.startsWith('http')) {
        return (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
            <img
              src={file.content}
              alt={file.name}
              className="max-h-[220px] rounded-lg object-contain shadow-md"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-3 break-all">{file.content}</span>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center p-4">
          <Image className="w-12 h-12 text-indigo-400 mb-2" />
          <span className="text-xs text-slate-400 font-semibold">Simulated Binary Image</span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">Resolution: 1920x1080 • PNG</span>
        </div>
      );
    }

    if (isCsv && file.content) {
      const rows = file.content.split('\n').map(row => row.split(','));
      const headers = rows[0] || [];
      const dataRows = rows.slice(1);

      return (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2.5 font-bold text-slate-300 font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-300 font-mono">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Default: Plain text, code, JSON
    return (
      <div className="relative bg-slate-950/60 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[300px]">
        {file.content || '/* Empty File */'}
      </div>
    );
  };

  const getFileIcon = () => {
    if (isImage) return <Image className="w-5 h-5 text-teal-400" />;
    if (isCsv) return <Database className="w-5 h-5 text-amber-400" />;
    if (isJson) return <FileCode className="w-5 h-5 text-purple-400" />;
    if (isCode) return <FileCode className="w-5 h-5 text-indigo-400" />;
    return <FileText className="w-5 h-5 text-sky-400" />;
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-end justify-center select-none">
      <div className="w-full bg-slate-900 border-t border-slate-800 rounded-t-[28px] p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-250">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center">
              {getFileIcon()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 line-clamp-1">{file.name}</h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                <span>{(file.size / 1024).toFixed(2)} KB</span>
                <span>•</span>
                <span>Owner: {file.owner.split('\\')[1] || file.owner}</span>
              </div>
            </div>
          </div>
          <button
            id="close-viewer"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic File content */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            <span>SMB File Preview</span>
          </div>
          {renderContent()}
        </div>

        {/* Actions bar */}
        <div className="flex gap-3 pt-2">
          <button
            id="viewer-download"
            onClick={() => onDownload(file)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download Original File</span>
          </button>
          
          <button
            id="viewer-close-btn"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-medium text-xs rounded-xl px-5 py-3 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
