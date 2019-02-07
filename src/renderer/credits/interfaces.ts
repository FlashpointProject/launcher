/** Data contained in the Credits file */
export interface ICreditsData {
  profiles: ICreditsDataProfile[];
}

export interface ICreditsDataProfile {
  title: string;
  icon: string;
}
