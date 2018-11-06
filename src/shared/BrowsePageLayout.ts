/** Modes for displaying the game collection at the BrowsePage */
export enum BrowsePageLayout {
  /** Games are in a vertical list, one game per row */
  list = 0,
  /** Games are in a table-like grid, each cell is a game */
  grid = 1,
}

/** BrowsePageLayout in string form */
export type BrowsePageLayoutString = 'list' | 'grid';

/** Convert a BrowsePageLayout value to a string (returns undefined if value is invalid) */
export function stringifyBrowsePageLayout(layout: BrowsePageLayout): BrowsePageLayoutString|undefined {
  switch (layout) {
    case BrowsePageLayout.list: return 'list';
    case BrowsePageLayout.grid: return 'grid';
  }
  return undefined;
}

/** Convert a string to a BrowsePageLayout value (returns undefined if string is invalid) */
export function parseBrowsePageLayout(str: string): BrowsePageLayout|undefined {
  switch (str) {
    case 'list': return BrowsePageLayout.list;
    case 'grid': return BrowsePageLayout.grid;
  }
  return undefined;
}
