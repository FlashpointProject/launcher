/**
 * Get the name of an "unknown platform" for a specific library.
 * @param libraryPrefix Prefix of the library the "unknown platform" is for.
 */
export function formatUnknownPlatformName(libraryPrefix: string): string {
  return libraryPrefix + 'Unknown Platform.xml';
}
