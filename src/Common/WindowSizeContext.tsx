import { createContext } from 'react';
import WindowSize from '../Models/WindowSize';

export const WindowSizeContext = createContext<WindowSize>({
  height: 0,
  width: 0,
});
