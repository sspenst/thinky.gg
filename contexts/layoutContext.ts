import { createContext } from 'react';

interface LayoutContextInterface {
  layoutHeight: number | undefined;
}

export const LayoutContext = createContext<LayoutContextInterface>({
  layoutHeight: 0,
});
