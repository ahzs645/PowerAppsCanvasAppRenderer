import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { executePowerFxAction, evaluateExpression, type PowerFxContextState } from '../utils/interpreter';

interface PowerFxContextValue {
    variables: PowerFxContextState;
    execute: (action: string) => void;
    evaluate: (expression: string) => any;
    reset: () => void;
}

const PowerFxContext = createContext<PowerFxContextValue | undefined>(undefined);

export const PowerFxProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [variables, setVariables] = useState<PowerFxContextState>({});

    const execute = (action: string) => {
        setVariables(prev => executePowerFxAction(action, prev));
    };

    const evaluate = (expression: string) => {
        return evaluateExpression(expression, variables);
    };

    const reset = () => {
        setVariables({});
    };

    return (
        <PowerFxContext.Provider value={{ variables, execute, evaluate, reset }}>
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
