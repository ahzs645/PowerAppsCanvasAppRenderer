import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { executePowerFxAction, evaluateExpression, type PowerFxContextState } from '../utils/interpreter';

interface PowerFxContextValue {
    variables: PowerFxContextState;
    dataSources: Record<string, any[]>;
    setDataSources: (dataSources: Record<string, any[]>) => void;
    execute: (action: string) => void;
    evaluate: (expression: string, self?: any, parent?: any, itemContext?: any) => any;
    registerControl: (name: string, props: any) => void;
    reset: () => void;
}

const PowerFxContext = createContext<PowerFxContextValue | undefined>(undefined);

interface PowerFxProviderProps {
    children: ReactNode;
    onNavigate?: (screenName?: string) => void;
    onNotify?: (message: string) => void;
    mockData?: string;
    currentUser?: {
        emailAddress?: string;
        fullName?: string;
        imageUrl?: string;
    } | null;
}

export const PowerFxProvider: React.FC<PowerFxProviderProps> = ({ children, onNavigate, onNotify, mockData, currentUser }) => {
    const [variables, setVariables] = useState<PowerFxContextState>({});
    const [controls, setControls] = useState<Record<string, any>>({});
    const [dataSources, setDataSources] = useState<Record<string, any[]>>({});

    // Sync mockData from props to dataSources state
    React.useEffect(() => {
        if (!mockData) return;
        try {
            const parsed = JSON.parse(mockData);
            // console.log("[DEBUG] PowerFxContext: Mock data sync, keys:", Object.keys(parsed));
            setDataSources(parsed);
        } catch (e) {
            console.warn("Invalid JSON in Mock Data:", e);
        }
    }, [mockData]);

    const allVariables = React.useMemo(() => {
        const result = { ...variables };
        result.User = currentUser ? {
            Email: currentUser.emailAddress || "",
            FullName: currentUser.fullName || "",
            Image: currentUser.imageUrl || ""
        } : {
            Email: "mock@example.com",
            FullName: "Mock User",
            Image: ""
        };
        return result;
    }, [variables, currentUser]);

    const execute = React.useCallback((action: string) => {
        setVariables(prev => {
            const evaluationContext = {
                ...allVariables, // Current variables + User
                ...controls,
                ...dataSources
            };
            // console.log("[DEBUG] PowerFxContext: execute context keys:", Object.keys(evaluationContext));
            return executePowerFxAction(action, prev, evaluationContext, onNavigate, onNotify);
        });
    }, [onNavigate, onNotify, allVariables, controls, dataSources]);

    const evaluate = React.useCallback((expression: string, self?: any, parent?: any, itemContext?: any) => {
        const fullContext = {
            ...allVariables,
            ...controls,
            ...dataSources,
            Self: self,
            Parent: parent,
            ThisItem: itemContext
        };
        return evaluateExpression(expression, fullContext);
    }, [allVariables, controls, dataSources]);

    const registerControl = React.useCallback((name: string, props: any) => {
        setControls(prev => {
            // Check if props are actually different to prevent unnecessary re-renders
            if (JSON.stringify(prev[name]) === JSON.stringify(props)) return prev;
            return {
                ...prev,
                [name]: props
            };
        });
    }, []);

    const reset = React.useCallback(() => {
        setVariables({});
        setControls({});
        setDataSources({});
    }, []);

    const value = React.useMemo(() => ({
        variables: allVariables,
        controls,
        dataSources,
        setDataSources,
        execute,
        evaluate,
        registerControl,
        reset
    }), [allVariables, controls, dataSources, execute, evaluate, registerControl, reset]);

    return (
        <PowerFxContext.Provider value={value}>
            {children}
        </PowerFxContext.Provider>
    );
};

export const usePowerFx = () => {
    const context = useContext(PowerFxContext);
    if (!context) {
        throw new Error("usePowerFx must be used within a PowerFxProvider");
    }
    return context;
};
