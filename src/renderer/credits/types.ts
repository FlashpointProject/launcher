/** Data contained inside the Credits file. */
export type CreditsData = {
  /** Order for roles to appear in */
  roles: CreditsDataRole[];
  /** Profiles of each person in the credits. */
  profiles: CreditsDataProfile[];
};

export type CreditsBlock = {
  role: CreditsDataRole;
  profiles: CreditsDataProfile[];
}

export type CreditsDataRole = {
  /** Role name */
  name: string;
  /** Hex color code of Role */
  color?: string;
  /** Description of role */
  description?: string;
  /** Do not categorize this role */
  noCategory?: boolean;
}

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
