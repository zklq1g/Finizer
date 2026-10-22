// src/context/ActorContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ActorContextType {
  actor: string;
  setActor: (name: string) => void;
  availableActors: string[];
}

const DEFAULT_ACTORS = ['Store Owner', 'Partner Ramesh', 'Store Manager Suresh'];

const ActorContext = createContext<ActorContextType>({
  actor: 'Store Owner',
  setActor: () => {},
  availableActors: DEFAULT_ACTORS,
});

export function ActorProvider({ children }: { children: React.ReactNode }) {
  const [actor, setActorState] = useState<string>('Store Owner');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('finizer_active_actor');
      if (saved) {
        setActorState(saved);
      }
    } catch {
      // localStorage may fail in restricted environments
    }
  }, []);

  const setActor = (name: string) => {
    setActorState(name);
    try {
      localStorage.setItem('finizer_active_actor', name);
    } catch {
      // ignore
    }
  };

  return (
    <ActorContext.Provider value={{ actor, setActor, availableActors: DEFAULT_ACTORS }}>
      {children}
    </ActorContext.Provider>
  );
}

export function useActor() {
  const context = useContext(ActorContext);
  if (!context) {
    throw new Error('useActor must be used within an ActorProvider');
  }
  return context;
}
