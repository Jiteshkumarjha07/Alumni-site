'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type FocusType = 'full' | 'partial';

interface UIContextType {
    isFocusMode: boolean;
    focusType: FocusType;
    setFocusMode: (value: boolean, type?: FocusType) => void;
    toggleFocusMode: (type?: FocusType) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [focusType, setFocusType] = useState<FocusType>('full');

    const setFocusMode = useCallback((value: boolean, type: FocusType = 'full') => {
        setIsFocusMode(value);
        setFocusType(type);
    }, []);

    const toggleFocusMode = useCallback((type: FocusType = 'full') => {
        setIsFocusMode(prev => !prev);
        setFocusType(type);
    }, []);

    return (
        <UIContext.Provider value={{ isFocusMode, focusType, setFocusMode, toggleFocusMode }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
