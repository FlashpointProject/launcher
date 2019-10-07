import * as path from 'path';
import { EditCuration } from "../context/CurationContext";
import { CurationIndex } from "./indexCuration";

/** Full path to Curation's unique folder */
export function getCurationFolder(curation: CurationIndex|EditCuration) {
    return path.join(window.External.config.fullFlashpointPath, 'Curations', curation.key);
}