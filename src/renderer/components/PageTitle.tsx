import { Paths } from '@shared/Paths';

const pagePairs: Record<string, string> = {
  [Paths.HOME]: 'Flashpoint Launcher',
  [Paths.BROWSE]: 'FPL - Browse',
  [Paths.TAGS]: 'FPL - Tags',
  [Paths.CATEGORIES]: 'FPL - Tag Categories',
  [Paths.LOGS]: 'FPL - Logs',
  [Paths.MANUAL]: 'FPL - Manual',
  [Paths.CONFIG]: 'FPL - Config',
  [Paths.ABOUT]: 'FPL - About',
  [Paths.CURATE]: 'FPL - Curate',
  [Paths.DOWNLOADS]: 'FPL - Downloads',
  [Paths.DYNAMIC]: 'FPL - Extension Content'
};

export function setPageTitle(pathname: string) {
  const segments = pathname.split('/');
  if (segments.length > 0) {
    const matcher = '/' + segments[1];
    if (matcher in pagePairs) {
      document.title = pagePairs[matcher];
    } else {
      document.title = pagePairs[Paths.HOME];
    }
  }
}
