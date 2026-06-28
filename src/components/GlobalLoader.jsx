import { useEffect, useState } from 'react';
import { useLoadingStore } from '../store/useLoadingStore';

const LOADING_MESSAGES = [
  'Initializing secure sandbox...',
  'Establishing gateway connection...',
  'Retrieving environment tokens...',
  'Configuring proctoring protocols...',
  'Securing compiler endpoints...',
  'Setting up assessment database...',
  'Verifying candidate state...'
];

export default function GlobalLoader() {
  const isLoading = useLoadingStore((state) => state.isLoading);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md select-none pointer-events-auto transition-opacity duration-300">
      {/* Outer wrapper to contain logo & rings */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Pulsing outer ambient glow */}
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl animate-pulse" />

        {/* Dynamic spinning gradients representing setting up */}
        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-secondary border-b-transparent border-l-transparent animate-spin duration-1000" />
        
        {/* Secondary counter-spinning outer dashed indicator */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-primary/30 animate-[spin_3s_linear_infinite_reverse]" />

        {/* Inner static border */}
        <div className="absolute inset-4 rounded-full border border-border/40 bg-surface/50 backdrop-blur-sm" />

        {/* Center Logo with premium frame */}
        <div className="absolute w-14 h-14 bg-surface-hover border border-border rounded-xl flex items-center justify-center p-2 shadow-2xl animate-pulse">
          <img 
            src="/logo.png" 
            alt="Secure Assessment Pro" 
            className="w-full h-full object-contain"
            onError={(e) => {
              // fallback if logo is not loaded
              e.target.style.display = 'none';
            }} 
          />
        </div>
      </div>

      {/* Message and loading text below */}
      <div className="mt-8 flex flex-col items-center text-center px-6 max-w-sm">
        <p className="text-sm font-semibold tracking-wide text-white transition-all duration-300 min-h-[20px] animate-pulse">
          {LOADING_MESSAGES[messageIndex]}
        </p>
        <span className="text-[10px] text-text-muted mt-2 uppercase tracking-widest font-mono font-bold">
          Configuring Portal
        </span>
      </div>
    </div>
  );
}
