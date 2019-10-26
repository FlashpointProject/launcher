/** Data contained inside the Credits file. */
export type CreditsData = {
  /** Profiles of each person in the credits. */
  profiles: CreditsDataProfile[];
};

export type CreditsDataProfile = {
  /** Title of the profile (their displayed name). */
  title: string;
  /** Roles of the profile (in the Discord server). */
  roles: string[];
  /** Note about the profile (additional text to display). */
  note?: string;
  /** Icon of the profile (Base64 encoded image). */
  icon?: string;
};
