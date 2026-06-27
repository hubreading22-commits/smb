/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, ArrowLeft, RotateCcw } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  showBezel: boolean;
  onHomeClick?: () => void;
  onBackClick?: () => void;
  canGoBack: boolean;
}

export default function AndroidFrame({
  children,
  showBezel,
  onHomeClick,
  onBackClick,
  canGoBack,
}: AndroidFrameProps) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!showBezel) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 min-h-screen">
        {/* Full-screen simulated Android status bar for realism */}
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800 shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold select-none text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800">SMB3 PORT 445</span>
            <span className="text-slate-400">{currentTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[10px] font-mono select-none">192.168.1.50</span>
            <Signal className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] font-bold">5G</span>
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
            <span className="text-[10px]">92%</span>
          </div>
        </div>
        
        {/* Main app viewport */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto my-4 transition-all duration-300 ease-in-out shrink-0">
      {/* Side physical buttons (visual-only or triggers simple actions) */}
      <div className="absolute right-[-3px] top-[140px] w-[3px] h-[45px] bg-slate-800 rounded-r-sm shadow-md" /> {/* Power Button */}
      <div className="absolute right-[-3px] top-[200px] w-[3px] h-[60px] bg-slate-800 rounded-r-sm shadow-md" /> {/* Volume Up/Down */}

      {/* Main Bezel Frame */}
      <div className="w-[380px] h-[780px] bg-slate-950 rounded-[48px] p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border-[6px] border-slate-800 flex flex-col relative select-none">
        
        {/* Top Punch-hole camera */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 rounded-full border border-slate-800/80 z-50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-blue-900 rounded-full opacity-60" />
        </div>

        {/* Ear Speaker Cutout */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-900 rounded-full z-50" />

        {/* Dynamic Display Area */}
        <div className="w-full h-full bg-slate-900 rounded-[34px] overflow-hidden flex flex-col relative border border-slate-950/40">
          
          {/* Android Status Bar */}
          <div className="h-9 px-6 pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-300 bg-slate-900 z-40 select-none select-none">
            <div>
              <span>{currentTime.split(' ')[0]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5 fill-slate-300/40" />
            </div>
          </div>

          {/* Virtual App viewport */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-900">
            {children}
          </div>

          {/* Android Gesture Pill & Software Buttons */}
          <div className="h-8 bg-slate-900 flex items-center justify-center relative shrink-0 z-40">
            <div className="w-28 h-1 bg-slate-600 rounded-full opacity-80" />
            
            {/* Soft Back Button (shows only when can go back) */}
            {canGoBack && onBackClick && (
              <button
                id="android-soft-back"
                onClick={onBackClick}
                className="absolute left-6 text-slate-400 hover:text-slate-100 active:scale-95 transition-all p-1"
                title="Simulate Android Back Button"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* Soft Home Button */}
            {onHomeClick && (
              <button
                id="android-soft-home"
                onClick={onHomeClick}
                className="absolute right-6 text-slate-400 hover:text-slate-100 active:scale-95 transition-all p-1"
                title="Go to Home/Login"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
