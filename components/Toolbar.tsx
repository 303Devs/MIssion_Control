'use client';

import { useState } from 'react';
import ChatPanel from './ChatPanel';

export default function Toolbar() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div className="h-12 border-b border-gray-800 bg-gray-950 flex items-center px-4 gap-4 shrink-0">
        {/* Search */}
        <div className={`flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-1.5 border transition-colors ${searchFocused ? 'border-emerald-500/50' : 'border-gray-800'} w-64`}>
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none flex-1"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>

        <div className="flex-1" />

        {/* Pause */}
        <button
          onClick={() => setPaused(!paused)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${paused ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {paused ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          )}
          {paused ? 'Resume' : 'Pause'}
        </button>

        {/* Ping Bob */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${chatOpen ? 'text-emerald-400' : 'text-gray-400 hover:text-emerald-400'}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Ping Bob
        </button>

        {/* Eye - Toggle visibility */}
        <button className="text-gray-400 hover:text-gray-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
