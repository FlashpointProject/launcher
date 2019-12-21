import { UpgradeStageState } from '../interfaces';

export type UpgradeStage = {
  id: string;
  title: string;
  description: string;
  /** Paths of files that should exist if the stage is "installed" (paths are relative to the flashpoint root) */
  verify_files: string[];
  /** SHA256 sums of the verifiable files */
  verify_sha256: string[];
  /** URLs from where the stage can be downloaded (only one will be downloaded, the other are "backups") */
  sources: string[];
  /** SHA256 sum of the source file */
  sources_sha256: string;
  /** Paths to delete from Install Path before installation / extraction */
  deletePaths: string[];
  /** Paths to ignore from the Install Path when installing / extracting */
  keepPaths: string[];
  /** State of this upgrade stage */
  state: UpgradeStageState;
};
