import { Tag } from 'flashpoint-launcher';
import { CurationIndexImage } from './OLD_types';

export type LoadedCuration = {
  folder: string;
  game: CurationMeta;
  addApps: AddAppCurationMeta[];
  thumbnail: CurationIndexImage;
  screenshot: CurationIndexImage;
}

export type CurationState = LoadedCuration & {

}

export type CurationMeta = Partial<{
  // Game fields
  title: string;
  alternateTitles: string;
  series: string;
  developer: string;
  publisher: string;
  status: string;
  extreme: boolean;
  tags: Tag[];
  source: string;
  launchCommand: string;
  library: string;
  notes: string;
  curationNotes: string;
  platform: string;
  applicationPath: string;
  playMode: string;
  releaseDate: string;
  version: string;
  originalDescription: string;
  language: string;
}>

export type AddAppCurationMeta = Partial<{
  heading: string;
  applicationPath: string;
  launchCommand: string;
}>
