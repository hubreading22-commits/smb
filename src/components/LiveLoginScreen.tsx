/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Server, User, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { SMBServerConfig, UserSession } from '../types';
import { login as apiLogin } from '../services/smbApi';

interface LiveLoginScreenProps {
  serverConfig: SMBServerConfig;
  onLoginSuccess: (session: UserSession) => void;
  onLogEntry: (type: 'CONNECT' | 'AUTH', status: 'SUCCESS' | 'FAILURE' | 'PENDING', message: string) => void;
}

export default function LiveLoginScreen({
  serverConfig,
  onLoginSuccess,
  onLogEntry,
}: LiveLoginScreenProps) {
  const [username, setUsername] = useState('digihub\\847');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedPassword = password;
    if (!trimmedUsername || !trimmedPassword) {
      setError('Username and password are required.');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9._-]+\\[a-zA-Z0-9._-]+$/;
    if (!domainRegex.test(trimmedUsername)) {
      setError('Username must be in DOMAIN\\username format.');
      return;
    }

    setIsLoading(true);
    onLogEntry('CONNECT', 'PENDING', `Authenticating against SMB backend at ${serverConfig.host}:${serverConfig.port}`);

    try {
      const result = await apiLogin(trimmedUsername, trimmedPassword);
      const newSession: UserSession = {
        username: result.username,
        domain: result.domain,
        shortUsername: result.shortUsername,
        role: result.role,
        loginTime: new Date().toISOString(),
        token: result.token,
      };

      onLogEntry('AUTH', 'SUCCESS', `User ${newSession.username} authenticated successfully.`);
      onLoginSuccess(newSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to authenticate with the SMB backend.';
      setError(message);
      onLogEntry('AUTH', 'FAILURE', `Authentication failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 text-slate-100 overflow-y-auto">
      <div className="flex flex-col items-center text-center mt-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-3 border border-indigo-400/25"
        >
          <Server className="w-7 h-7 text-white" />
        </motion.div>
        <h1 className="text-xl font-bold tracking-tight text-white font-sans">DigiHub SMB Explorer</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
          Connect directly to your Active Directory SMB server. No local simulation, no fake share inventory.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="my-auto space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Host</label>
          <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-slate-300 select-none">
            <Server className="w-4 h-4 text-slate-500 mr-2.5" />
            <span className="font-mono text-sm text-slate-100">{serverConfig.host}</span>
            <span className="absolute right-3.5 bg-slate-800 text-[10px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
              Port {serverConfig.port}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Username</label>
          <div className="relative flex items-center bg-slate-950 border focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 border-slate-800 rounded-xl px-3.5 py-3 transition-all duration-200">
            <User className="w-4 h-4 text-slate-400 mr-2.5" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="DOMAIN\\username"
              className="bg-transparent border-none outline-none text-sm text-slate-100 placeholder-slate-500 w-full font-mono"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Password</label>
          <div className="relative flex items-center bg-slate-950 border focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 border-slate-800 rounded-xl px-3.5 py-3 transition-all duration-200">
            <Lock className="w-4 h-4 text-slate-400 mr-2.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Windows password"
              className="bg-transparent border-none outline-none text-sm text-slate-100 placeholder-slate-500 w-full font-mono"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-slate-400 hover:text-slate-200 ml-1.5 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-950/40 border border-rose-800 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-300"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Login failed</p>
              <p className="text-slate-200 mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl py-3.5 text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 ${isLoading ? 'opacity-80 pointer-events-none' : ''}`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Connecting to SMB backend...</span>
            </>
          ) : (
            <span>Sign in to SMB Explorer</span>
          )}
        </button>
      </form>

      <div className="pt-6 text-[10px] text-slate-500 leading-relaxed">
        <p>Use your Active Directory credentials and connect directly to the live SMB share host. The app does not persist mock folder state locally.</p>
      </div>
    </div>
  );
}
