const platformIconsPath = './images/platforms/';
/** Contains paths to the icon images of all platforms */
export const platformIcons = Object.freeze({
  flash:     platformIconsPath + 'flash.png',
  html5:     platformIconsPath + 'html5.png',
  java:      platformIconsPath + 'java.png',
  popcap:    platformIconsPath + 'popcap.png',
  shockwave: platformIconsPath + 'shockwave.png',
  unity:     platformIconsPath + 'unity.png',
});

export function getPlatformIconPath(platform: string): string|undefined {
  return (platformIcons as any)[platform];
}
