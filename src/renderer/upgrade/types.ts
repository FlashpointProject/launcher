import { UpgradeStageState } from '../interfaces';

export type UpgradeStage = {
  id: string;
  title: string;
  description: string;
  /** Paths of files that should exist if the stage is "installed" (paths are relative to the flashpoint root) */
  checks: string[];
  /** URLs from where the stage can be downloaded (only one will be downloaded, the other are "backups") */
  sources: string[];
  /** State of this upgrade stage */
  state: UpgradeStageState;
};
