import { ILaunchBoxGame } from "./interfaces";

export class LaunchBoxGame {

  public static parse(gameElement: Element): ILaunchBoxGame {
    let parsed: ILaunchBoxGame = {};
    for (let i = 0; i < gameElement.children.length; i++) {
      // Get tag & value
      const element = gameElement.children[i];
      const tagName: string = element.tagName;
      const value: string|null = element.textContent;
      // Skip tag if value is not set
      if (value === null) { continue; }
      // Try getting the tag's property name
      const prop: string|null = LaunchBoxGame.tagNameToPropName(tagName);
      if (prop === null) { continue; }
      // Add the prop and value to the parsed object
      // @TODO Convert the value to the correct type for that property!
      (parsed as any)[prop] = value;
    }
    return parsed;
  }

  /**
   * Convert a tag name of a <Game> XML element to the parsed property's name
   * @param tagName Tag name
   */
  public static tagNameToPropName(tagName: string): string|null {
    // Check if tag name is valid
    if (LaunchBoxGame.xmlTags.indexOf(tagName) === -1) { return null; }
    // Convert the tag name to camel case
    if (tagName === 'ID') { return 'id'; }
    return tagName.charAt(0).toLowerCase() + tagName.slice(1);
  }
  
  /** All valid tag names for children of <Game> */
  public static readonly xmlTags: string[] = [
    'ApplicationPath',
    'CommandLine',
    'Completed',
    'ConfigurationCommandLine',
    'ConfigurationPath',
    'DateAdded',
    'DateModified',
    'Developer',
    'DosBoxConfigurationPath',
    'Emulator',
    'Favorite',
    'ID',
    'ManualPath',
    'MusicPath',
    'Notes',
    'Platform',
    'Publisher',
    'Rating',
    'RootFolder',
    'ScummVMAspectCorrection',
    'ScummVMFullscreen',
    'ScummVMGameDataFolderPath',
    'ScummVMGameType',
    'SortTitle',
    'Source',
    'StarRatingFloat',
    'StarRating',
    'CommunityStarRating',
    'CommunityStarRatingTotalVotes',
    'Status',
    'WikipediaURL',
    'Title',
    'UseDosBox',
    'UseScummVM',
    'Version',
    'Series',
    'PlayMode',
    'Region',
    'PlayCount',
    'Portable',
    'VideoPath',
    'Hide',
    'Broken',
    'Genre',
    'MissingVideo',
    'MissingBoxFrontImage',
    'MissingScreenshotImage',
    'MissingClearLogoImage',
    'MissingBackgroundImage',
  ];
}
