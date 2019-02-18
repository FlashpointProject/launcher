/** Data contained in the Credits file */
export interface ICreditsData {
  profiles: ICreditsDataProfile[];
}

export interface ICreditsDataProfile {
  /** Title of the person */
  title: string;
  /** Roles of the person (in the Discord server) */
  roles: string[];
  /** Note about the person */
  note?: string;
  /** Base64 encoded image */
  icon?: string;
}
