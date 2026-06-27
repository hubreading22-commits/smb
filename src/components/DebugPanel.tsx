/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Terminal, Shield, Network, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SMBLogEntry, UserSession } from '../types';

interface DebugPanelProps {
  logs: SMBLogEntry[];
  isServerOnline: boolean;
  onToggleServer: () => void;
  onResetServer: () => void;
  activeSession: UserSession | null;
}

export default function DebugPanel({
  logs,
  isServerOnline,
  onToggleServer,
  onResetServer,
  activeSession,
}: DebugPanelProps) {
  return (
    <div className="w-full lg:w-[400px] bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col space-y-5 shadow-2xl shrink-0 select-none">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-400">
          <Terminal className="w-5 h-5" />
          <h2 className="text-sm font-bold text-slate-100 font-sans tracking-tight">SMB3 Diagnostics Server console</h2>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Monitor SMB protocol exchanges, security descriptors, and simulated AD sessions.
        </p>
      </div>

      {/* Connection State Panel */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Network className="w-4 h-4 text-indigo-400" />
            <span>SMB Connection Switch</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
            isServerOnline 
              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' 
              : 'bg-rose-950/50 text-rose-400 border border-rose-800'
          }`}>
            {isServerOnline ? 'SMB3 ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Toggle this switch to simulate physical networking failures. When offline, login attempts will fail with: <span className="text-amber-400 italic">"Unable to connect to the server."</span>
        </p>

        <div className="flex gap-2.5">
          <button
            id="debug-toggle-server"
            onClick={onToggleServer}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              isServerOnline 
                ? 'bg-rose-650/20 text-rose-400 border border-rose-800 hover:bg-rose-650/35' 
                : 'bg-emerald-650/20 text-emerald-400 border border-emerald-800 hover:bg-emerald-650/35'
            }`}
          >
            {isServerOnline ? 'Disconnect Server (Offline)' : 'Connect Server (Online)'}
          </button>
          
          <button
            id="debug-reset-storage"
            onClick={onResetServer}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 font-semibold cursor-pointer transition-colors"
            title="Reset storage to original defaults"
          >
            Reset Disk
          </button>
        </div>
      </div>

      {/* AD Security Context */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Active Directory Context</span>
        </div>

        {activeSession ? (
          <div className="space-y-2 text-[10px]">
            <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              <div>
                <span className="block text-slate-500 text-[8px] uppercase">User Principal</span>
                <span className="text-slate-200 truncate block font-bold">{activeSession.username}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[8px] uppercase">Role Type</span>
                <span className="text-indigo-400 font-bold">{activeSession.role.toUpperCase()}</span>
              </div>
              <div className="col-span-2 border-t border-slate-800/80 pt-1.5 mt-0.5">
                <span className="block text-slate-500 text-[8px] uppercase">Security Groups (SIDs)</span>
                <div className="space-y-0.5 text-slate-300 text-[9px]">
                  <div>• S-1-5-21-DIGIHUB-513 (Domain Users)</div>
                  {activeSession.role === 'admin' && (
                    <div className="text-emerald-400 font-semibold">• S-1-5-21-DIGIHUB-512 (Domain Admins)</div>
                  )}
                  {activeSession.role === 'employee' && (
                    <div className="text-indigo-400 font-semibold">• S-1-5-21-DIGIHUB-847 (Staff Members)</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-slate-500 py-1.5 italic">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>No Active SMB Tree Context. Establish connection to view ACL mappings.</span>
          </div>
        )}
      </div>

      {/* SMB Transaction Log Terminal */}
      <div className="flex-1 flex flex-col min-h-[160px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-3.5 py-2 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>SMB Packet Exchange Stream</span>
          </div>
        </div>

        {/* Scrolling list of logs */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[9px] space-y-1.5 scrollbar-thin select-text">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No packets captured yet. Start logging in or browsing directory.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="leading-relaxed border-b border-slate-900/40 pb-1.5 last:border-0">
                <div className="flex items-center justify-between text-slate-500 text-[8px]">
                  <span>{log.timestamp}</span>
                  <span className={`font-bold ${
                    log.status === 'SUCCESS' ? 'text-emerald-500' : log.status === 'FAILURE' ? 'text-rose-500' : 'text-amber-500'
                  }`}>
                    [{log.status}]
                  </span>
                </div>
                <div className="text-slate-300 mt-0.5">
                  <span className="text-indigo-400 font-bold mr-1.5">[{log.type}]</span>
                  {log.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
