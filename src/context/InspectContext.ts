import { createContext, useContext } from 'react';

/**
 * When true, controls show editor-focus affordances (hover dashed outline,
 * selection highlight, select-on-click, right-click menu). When false the
 * canvas renders as a clean app preview with no inspection chrome.
 */
export const InspectContext = createContext<boolean>(false);
export const useInspect = () => useContext(InspectContext);
