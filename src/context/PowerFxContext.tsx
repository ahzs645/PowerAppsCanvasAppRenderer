import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { executePowerFxAction, evaluateExpression, type PowerFxContextState } from '../utils/interpreter';

interface PowerFxContextValue {
    variables: PowerFxContextState;
    controls: Record<string, any>;
    execute: (action: string) => void;
    evaluate: (expression: string, self?: any, parent?: any) => any;
    registerControl: (name: string, props: any) => void;
    reset: () => void;
}

const PowerFxContext = createContext<PowerFxContextValue | undefined>(undefined);

interface PowerFxProviderProps {
    children: ReactNode;
    onNavigate?: (screenName: string) => void;
    onNotify?: (message: string) => void;
}

export const PowerFxProvider: React.FC<PowerFxProviderProps> = ({ children, onNavigate, onNotify }) => {
    const [variables, setVariables] = useState<PowerFxContextState>({});
    const [controls, setControls] = useState<Record<string, any>>({});

    const execute = React.useCallback((action: string) => {
        setVariables(prev => executePowerFxAction(action, prev, onNavigate, onNotify));
    }, [onNavigate, onNotify]);

    const evaluate = React.useCallback((expression: string, self?: any, parent?: any) => {
        return evaluateExpression(expression, { ...variables, ...controls, Self: self, Parent: parent });
    }, [variables, controls]);

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
    }, []);

    const value = React.useMemo(() => ({
        variables,
        controls,
        execute,
        evaluate,
        registerControl,
        reset
    }), [variables, controls, execute, evaluate, registerControl, reset]);

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
