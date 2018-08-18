import { ReactNode } from 'react';
import { ILaunchBoxPlatform } from '../shared/launchbox/interfaces';

/**
 * "match" object from 'react-router' and 'history' npm packages
 * @property {any} params Key/value pairs parsed from the URL corresponding to the dynamic segments of the path
 * @property {boolean} isExact true if the entire URL was matched (no trailing characters)
 * @property {string} path The path pattern used to match. Useful for building nested <Route>s
 * @property {string} url The matched portion of the URL. Useful for building nested <Link>s
 */
export interface IMatch {
  params: any;
  isExact: boolean;
  path: string;
  url: string;
}

export interface IDefaultProps {
  children?: ReactNode;
}

/** An object that contains usefull stuff and is passed throughout the react app as a prop/state
 * (This should be temporary and used for quick and direty testing and implementation)
 * (Replace this with something more thought out and maintainable once the project has more structure)
 */
export interface ICentralState {
  platform?: ILaunchBoxPlatform;
  flashpointPath?: string;
}
