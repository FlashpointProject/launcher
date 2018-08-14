import { ReactNode } from 'react';

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
