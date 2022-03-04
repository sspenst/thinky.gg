import { createContext } from 'react';
import WindowSize from '../models/windowSize';

export const WindowSizeContext = createContext<WindowSize>({
  height: 0,
  width: 0,
});
