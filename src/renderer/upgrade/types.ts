/** Data contained inside the Upgrade file. */
export type UpgradeData = {
  tech: UpgradeStage;
  screenshots: UpgradeStage;
};

export type UpgradeStage = {
  title: string;
  description: string;
  /** Paths of files that should exist if the stage is "installed" (paths are relative to the flashpoint root) */
  checks: string[];
  /** URLs from where the stage can be downloaded (only one will be downloaded, the other are "backups") */
  sources: string[];
};
