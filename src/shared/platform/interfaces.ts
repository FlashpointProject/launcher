import { IGameCollection } from "../game/interfaces"

export type PlatformInfo = {
  name: string;
  library: string;
}

export type GamePlatform = {
  filePath: string;
  name: string;
  library: string;
  data: IRawPlatformFile;
  collection: IGameCollection;
}

export type IRawPlatformFile = {
  LaunchBox: IRawPlatform
}

export type IRawPlatform = {
  Game?: IRawGameInfo | IRawGameInfo[],
  AdditionalApplication?: IRawAdditionalApplicationInfo | IRawAdditionalApplicationInfo[]
}

/**
 * This interface represents a Game as stored in Platform XMLs (<Game> Tag)
 * Comments represent their XML data types and IPureGameInfo counterparts
 * (NOTE: The property names are not necessarily the same as the XML node names,
 *  so this might not be completely convertible by making the first character lower/upper case)
 * ( http://pluginapi.launchbox-app.com/html/b33d2055-e2be-3f42-12c6-adbc5668f454.htm )
 */
export type IRawGameInfo = {
  ID: string;                   // (String)
  Title?: string;               // (String)
  Series?: string;              // (String)
  Developer?: string;           // (String)
  Publisher?: string;           // (String)
  DateAdded?: string;           // (DateTime)
  Platform?: string;            // (String)
  Broken?: boolean;             // (Boolean)
  Hide?: boolean;               // (Boolean) - Extreme
  PlayMode?: string;            // (String)
  Status?: string;              // (String)
  Notes?: string;               // (String)
  Genre?: string;               // (String) - Tags / Genres
  Source?: string;              // (String)
  ApplicationPath?: string;     // (String)
  CommandLine?: string;         // (String) - Launch Command
  ReleaseDate?: string;         // (Nullable<DateTime>)
  Version?: string;             // (String)
  OriginalDescription?: string; // (String)
  Language?: string;            // (String)
}

/**
 * This interface represents an Additional Application as stored in Platform XMLs (<AdditionalApplication> Tag)
 * Comments represent their XML data types and IAdditionalApplicationInfo counterparts
 * (NOTE: The property names are not necessarily the same as the XML node names,
 *  so this might not be completely convertible by making the first character lower/upper case)
 * ( http://pluginapi.launchbox-app.com/html/b33d2055-e2be-3f42-12c6-adbc5668f454.htm )
 */
export type IRawAdditionalApplicationInfo = {
  Id: string;                // (String)
  GameID?: string;           // (String)
  ApplicationPath?: string;  // (String)
  AutoRunBefore?: boolean;   // (Boolean)
  CommandLine?: string;      // (String) - Launch Command
  Name?: string;             // (String)
  WaitForExit?: boolean;     // (Boolean)
}
