// src/context/ActorContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ActorContextType {
  actor: string;
  setActor: (name: string) => void;
  availableActors: string[];
  addActor: (name: string) => void;
  removeActor: (name: string) => void;
}

const DEFAULT_ACTORS = ['Store Owner'];
const ACTORS_STORAGE_KEY = 'finizer_actors';

const ActorContext = createContext<ActorContextType>({
  actor: 'Store Owner',
  setActor: () => {},
  availableActors: DEFAULT_ACTORS,
  addActor: () => {},
  removeActor: () => {},
});

export function ActorProvider({ children }: { children: React.ReactNode }) {
  const [actor, setActorState] = useState<string>('Store Owner');
  const [availableActors, setAvailableActors] = useState<string[]>(DEFAULT_ACTORS);

  useEffect(() => {
    try {
      const savedActor = localStorage.getItem('finizer_active_actor');
      if (savedActor) {
        setActorState(savedActor);
      }
      const savedActors = localStorage.getItem(ACTORS_STORAGE_KEY);
      if (savedActors) {
        const parsed = JSON.parse(savedActors);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableActors(parsed);
        }
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

  const addActor = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || availableActors.includes(trimmed)) return;
    const updated = [...availableActors, trimmed];
    setAvailableActors(updated);
    try {
      localStorage.setItem(ACTORS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeActor = (name: string) => {
    if (availableActors.length <= 1) return; // Keep at least one
    const updated = availableActors.filter((a) => a !== name);
    setAvailableActors(updated);
    if (actor === name) {
      setActor(updated[0]);
    }
    try {
      localStorage.setItem(ACTORS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <ActorContext.Provider value={{ actor, setActor, availableActors, addActor, removeActor }}>
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
