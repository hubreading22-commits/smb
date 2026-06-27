/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Server, User, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { SMBServerConfig } from '../types';

interface LoginScreenProps {
  serverConfig: SMBServerConfig;
  isServerOnline: boolean;
  onLoginSuccess: (username: string) => void;
  onLogEntry: (type: 'CONNECT' | 'AUTH', status: 'SUCCESS' | 'FAILURE' | 'PENDING', message: string) => void;
}

export default function LoginScreen({
  serverConfig,
  isServerOnline,
  onLoginSuccess,
  onLogEntry,
}: LoginScreenProps) {
  const [username, setUsername] = useState('digihub\\847');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    onLogEntry('CONNECT', 'PENDING', `Establishing SMB3 connection to ${serverConfig.host}:${serverConfig.port}...`);

    // Simulate network delay (SMB negotiations, tree connect, session setups)
    setTimeout(() => {
      // 1. Check server connectivity
      if (!isServerOnline) {
        const errorMsg = 'Unable to connect to the server.';
        setError(errorMsg);
        setIsLoading(false);
        onLogEntry('CONNECT', 'FAILURE', `Failed to connect to ${serverConfig.host}: Port unreachable or host offline.`);
        return;
      }

      onLogEntry('CONNECT', 'SUCCESS', `SMB3 handshake successful. Protocol SMB3_11 negotiated.`);
      onLogEntry('AUTH', 'PENDING', `Authenticating credentials for user: ${username}...`);

      // 2. Validate Username Format (DOMAIN\username)
      const domainRegex = /^[a-zA-Z0-9._-]+\\[a-zA-Z0-9._-]+$/;
      if (!domainRegex.test(username)) {
        const errorMsg = 'Invalid username format. Must be DOMAIN\\username (e.g., digihub\\847)';
        setError(errorMsg);
        setIsLoading(false);
        onLogEntry('AUTH', 'FAILURE', `Authentication rejected: Username format mismatch.`);
        return;
      }

      // 3. Authenticate credentials
      // Standard accepted test users for the high-fidelity simulator:
      // Any password is accepted for testing, but let's simulate realistic AD check
      const lowercaseUser = username.toLowerCase();
      
      // We will allow password to be anything non-empty to make it user-friendly,
      // but if they put an empty password, let's complain.
      if (!password.trim()) {
        const errorMsg = 'Invalid username or password.';
        setError(errorMsg);
        setIsLoading(false);
        onLogEntry('AUTH', 'FAILURE', `Authentication failed: Empty password provided.`);
        return;
      }

      // Authentic SMB simulation
      onLogEntry('AUTH', 'SUCCESS', `Nego Session ID generated. User ${username} successfully authenticated against domain controller.`);
      onLoginSuccess(username);
      setIsLoading(false);
    }, 1200);
  };

  // Helper to quickly populate logins for demonstration
  const handleQuickFill = (userType: 'staff' | 'admin' | 'guest') => {
    setError(null);
    if (userType === 'staff') {
      setUsername('digihub\\847');
      setPassword('password123');
    } else if (userType === 'admin') {
      setUsername('digihub\\john');
      setPassword('adminPass99');
    } else {
      setUsername('digihub\\guest');
      setPassword('guestSession');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 text-slate-100 overflow-y-auto">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mt-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-3 border border-indigo-400/20"
        >
          <Server className="w-7 h-7 text-white" />
        </motion.div>
        <h1 className="text-xl font-bold tracking-tight text-white font-sans">
          DigiHub Client
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
          Secure SMB3 Windows File Explorer for Active Directory
        </p>
      </div>

      {/* Main Login Form */}
      <div className="my-auto py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Read-Only Host Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Host (Read Only)
            </label>
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-slate-400 select-none">
              <Server className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
              <span className="font-mono text-sm">{serverConfig.host}</span>
              <span className="absolute right-3.5 bg-slate-800 text-[10px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                Port {serverConfig.port}
              </span>
            </div>
          </div>

          {/* Username (Domain format required) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Username
            </label>
            <div className="relative flex items-center bg-slate-950 border focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 border-slate-800 rounded-xl px-3.5 py-3 transition-all duration-200">
              <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="domain\username"
                className="bg-transparent border-none outline-none text-sm text-slate-100 placeholder-slate-500 w-full font-mono"
                required
                disabled={isLoading}
              />
            </div>
            <p className="text-[10px] text-slate-500 italic pl-1">
              Format: DOMAIN\username (e.g. <span className="underline">digihub\847</span>)
            </p>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Password
            </label>
            <div className="relative flex items-center bg-slate-950 border focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 border-slate-800 rounded-xl px-3.5 py-3 transition-all duration-200">
              <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Windows password"
                className="bg-transparent border-none outline-none text-sm text-slate-100 placeholder-slate-500 w-full font-mono"
                required
                disabled={isLoading}
              />
              <button
                id="toggle-password"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-200 ml-1.5 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-950/40 border border-rose-800 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <span className="font-semibold block">Authentication Error</span>
                <p className="opacity-90">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Login Button */}
          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl py-3.5 text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 border border-indigo-400/10 cursor-pointer ${
              isLoading ? 'opacity-85 pointer-events-none' : ''
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating with SMB3...</span>
              </>
            ) : (
              <span>Login to SMB Explorer</span>
            )}
          </button>
        </form>
      </div>

      {/* Quick Fill demo section */}
      <div className="border-t border-slate-800/80 pt-4 mt-auto">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2 text-center">
          Active Directory Personas (Quick-Fill)
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            id="quick-fill-staff"
            type="button"
            onClick={() => handleQuickFill('staff')}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg p-2 text-center text-[10px] text-slate-300 transition-colors"
          >
            <div className="font-semibold text-indigo-400">User 847</div>
            <div className="text-[8px] text-slate-500 font-mono">Staff Share</div>
          </button>
          <button
            id="quick-fill-admin"
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg p-2 text-center text-[10px] text-slate-300 transition-colors"
          >
            <div className="font-semibold text-emerald-400">IT john</div>
            <div className="text-[8px] text-slate-500 font-mono">Full Admin</div>
          </button>
          <button
            id="quick-fill-guest"
            type="button"
            onClick={() => handleQuickFill('guest')}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg p-2 text-center text-[10px] text-slate-300 transition-colors"
          >
            <div className="font-semibold text-amber-400">Guest User</div>
            <div className="text-[8px] text-slate-500 font-mono">Public Read</div>
          </button>
        </div>
      </div>
    </div>
  );
}
