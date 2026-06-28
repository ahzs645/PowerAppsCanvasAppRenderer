import React, { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';
import { Evaluator, createStore, parseFormula, type Store, type Host } from '../utils/powerfx';
import { applyConnectionsConfig, type ConnectionsConfig } from '../utils/connections';

interface PowerFxContextValue {
    evaluate: (expression: string, self?: any, parent?: any, itemContext?: any) => any;
    execute: (action: string, itemContext?: any, selfObj?: any) => void;
    registerControl: (name: string, props: any, onSelect?: string) => void;
    store: Store;
    version: number;
}

const PowerFxContext = createContext<PowerFxContextValue | undefined>(undefined);

interface PowerFxProviderProps {
    children: ReactNode;
    onNavigate?: (screenName?: string) => void;
    onNotify?: (message: string) => void;
    onStart?: string | null;
    connections?: ConnectionsConfig | null;
    currentUser?: {
        emailAddress?: string;
        fullName?: string;
        imageUrl?: string;
    } | null;
}

export const PowerFxProvider: React.FC<PowerFxProviderProps> = ({ children, onNavigate, onNotify, onStart, connections, currentUser }) => {
    const storeRef = useRef<Store>(createStore());
    const [version, setTick] = useState(0);
    const startedRef = useRef<string | null>(null);
    const seededRef = useRef(false);

    const user = currentUser
        ? { Email: currentUser.emailAddress || '', FullName: currentUser.fullName || '', Image: currentUser.imageUrl || '' }
        : { Email: 'mock@example.com', FullName: 'Mock User', Image: '' };

    // Seed fake connections / data sources BEFORE App.OnStart runs, so OnStart
    // (and first paint) can read data sources and connector responses.
    if (!seededRef.current) {
        seededRef.current = true;
        applyConnectionsConfig(storeRef.current, connections, user);
    }

    const host: Host = {
        navigate: onNavigate,
        notify: onNotify,
        selectControl: (name: string) => {
            const formula = storeRef.current.onSelects[name];
            if (formula) {
                const ev = new Evaluator(storeRef.current, host, { User: user });
                try { ev.eval(parseFormula(formula)); } catch (e) { console.warn('Select() failed for', name, e); }
            }
        },
    };

    // Run App.OnStart once, synchronously during render, BEFORE children evaluate,
    // so collections/variables exist on first paint.
    if (onStart && startedRef.current !== onStart) {
        startedRef.current = onStart;
        const ev = new Evaluator(storeRef.current, host, { User: user });
        try { ev.eval(parseFormula(onStart)); } catch (e) { console.warn('OnStart failed', e); }
    }

    const evaluate = useCallback((expression: string, self?: any, parent?: any, itemContext?: any) => {
        if (typeof expression !== 'string') return expression;
        const ev = new Evaluator(storeRef.current, host, { Self: self, Parent: parent, ThisItem: itemContext, User: user });
        try { return ev.eval(parseFormula(expression)); }
        catch (e) { return expression.startsWith('=') ? expression.slice(1) : expression; }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.FullName]);

    const execute = useCallback((action: string, itemContext?: any, selfObj?: any) => {
        if (!action) return;
        const ev = new Evaluator(storeRef.current, host, { Self: selfObj, ThisItem: itemContext, User: user });
        try { ev.eval(parseFormula(action)); } catch (e) { console.warn('Action failed', e); }
        setTick(t => t + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.FullName]);

    const registerControl = useCallback((name: string, props: any, onSelect?: string) => {
        storeRef.current.controls[name] = props;
        if (onSelect) storeRef.current.onSelects[name] = onSelect;
    }, []);

    const value: PowerFxContextValue = { evaluate, execute, registerControl, store: storeRef.current, version };

    return <PowerFxContext.Provider value={value}>{children}</PowerFxContext.Provider>;
};

export const usePowerFx = () => {
    const context = useContext(PowerFxContext);
    if (!context) throw new Error('usePowerFx must be used within a PowerFxProvider');
    return context;
};
