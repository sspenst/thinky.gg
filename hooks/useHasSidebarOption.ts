import Dimensions from '../constants/dimensions';
import { LevelContext } from '../contexts/levelContext';
import { PageContext } from '../contexts/pageContext';
import { useContext } from 'react';

export default function useHasSidebarOption(): boolean {
  const levelContext = useContext(LevelContext);
  const { windowSize } = useContext(PageContext);

  return levelContext !== null && levelContext.level !== undefined && !levelContext.level.isDraft && windowSize.width >= 2 * Dimensions.SidebarWidth;
}
