import React, { useState, useRef } from 'react';
import { Lock } from 'lucide-react';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface SensitiveCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const SensitiveCard: React.FC<SensitiveCardProps> = ({ label, value, icon, className }) => {
  const [locked, setLocked] = useState(true);
  const [showPinInput, setShowPinInput] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = useAuthStore(state => state.currentUser);

  const handleCardClick = () => {
    if (locked && !showPinInput) {
      setShowPinInput(true);
      setError('');
      setInputPin('');
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Not logged in');
      return;
    }
    // Use the entered password as the PIN and verify with backend
    try {
      const result = await apiService.verifyPassword(currentUser, inputPin);
      if (result.valid) {
        setLocked(false);
        setShowPinInput(false);
        setError('');
        timeoutRef.current = setTimeout(() => {
          setLocked(true);
        }, 2500);
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Verification failed');
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`relative w-full h-32 rounded-xl shadow-lg border-2 flex flex-col justify-between cursor-pointer overflow-hidden transition-colors duration-300 ${className || ''}`}
      onClick={handleCardClick}
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      role="button"
      aria-label={`Show ${label}`}
    >
      {/* Card content (always visible) */}
      {locked ? (
        <>
          <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-0">
            <span className="text-sm font-medium">{label}</span>
            {icon && <div>{icon}</div>}
          </div>
          <div className="flex flex-col items-end px-4 pb-4 flex-1 justify-end">
            <span className={`text-2xl font-bold transition-all duration-300 blur-sm select-none`}>{value}</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-0">
            <span className="text-lg font-semibold">{label}</span>
            {icon && <div>{icon}</div>}
          </div>
          <div className="flex flex-row items-end px-4 pb-4 flex-1 justify-between">
            <span className="text-2xl font-bold text-left">{value}</span>
            <span className="flex-1" />
          </div>
        </>
      )}
      {/* Overlay with heading and lock icon when locked and not showing PIN */}
      {locked && !showPinInput && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
          <span className="text-lg font-semibold mb-2">{label}</span>
          <Lock className="h-7 w-7 text-gray-500 opacity-90 mb-1" />
          <span className="text-xs text-gray-700 mt-2">Click to unlock</span>
        </div>
      )}
      {/* PIN Input Overlay */}
      {showPinInput && (
        <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20">
          <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-2">
            <input
              type="password"
              value={inputPin}
              onChange={e => setInputPin(e.target.value)}
              className="border rounded px-3 py-1 text-lg text-center focus:outline-none focus:ring focus:border-blue-400"
              maxLength={32}
              autoFocus
              placeholder="Enter password"
            />
            <button type="submit" className="px-4 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Unlock</button>
            {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
          </form>
        </div>
      )}
    </div>
  );
}; 