import WindowSize from '../models/windowSize';
import { createContext } from 'react';

export const WindowSizeContext = createContext<WindowSize>({
  height: 0,
  width: 0,
});
