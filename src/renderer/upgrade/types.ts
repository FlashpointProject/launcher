import { UpgradeStageState } from '../interfaces';

export type UpgradeStage = {
  id: string;
  title: string;
  description: string;
  /** Paths of files that should exist if the stage is "installed" (paths are relative to the flashpoint root) */
  verify_files: string[];
  /** MD5 sums of the verifiable files */
  verify_md5: string[];
  /** URLs from where the stage can be downloaded (only one will be downloaded, the other are "backups") */
  sources: string[];
  /** MD5 sum of the source file */
  sources_md5: string;
  /** Paths to delete from Install Path before installation / extraction */
  deletePaths: string[];
  /** Paths to ignore from the Install Path when installing / extracting */
  keepPaths: string[];
  /** Whether to install in the Launcher folder or not */
  launcherUpgrade: boolean;
  /** State of this upgrade stage */
  state: UpgradeStageState;
};
