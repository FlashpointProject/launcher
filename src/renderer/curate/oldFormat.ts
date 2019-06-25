/**
 * A representation of the meta data of a curation (using the old curation format).
 * This is the parsed data of a "meta.txt" file.
 */
export type IOldCurationMeta = {
  title?: string;
  series?: string;
  developer?: string;
  publisher?: string;
  status?: string;
  extreme?: string;
  genre?: string;
  source?: string;
  launchCommand?: string;
  notes?: string;
  authorNotes?: string;
};

/**
 * Parse the meta data of a curation (using the old curation format).
 * @param meta Meta data.
 * @returns Parsed object representation of the meta data. 
 */
export function parseOldCurationMeta(meta: string): IOldCurationMeta {
  const parsed: IOldCurationMeta = {};
  // Parse metadata line by line
  const lines = meta.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const index = line.indexOf(':');
    if (index >= 0) {
      // Extract the field name and value from the line
      const fieldName = line.substring(0, index);
      const fieldValue = line.substring(index + 1);
      // Apply the value to the co-responding property
      const propertyName = getPropertyName(fieldName);
      if (propertyName !== undefined && parsed[propertyName] === undefined) {
        parsed[propertyName] = fieldValue.trimLeft();
      }
    }
  }
  return parsed;
}

/**
 * Get the name of the property co-responding to a field name.
 * @param fieldName Field name to get the co-responding property name of.
 * @returns The property name (or undefined if the field name is invalid).
 */
function getPropertyName(fieldName: string): (keyof IOldCurationMeta) | undefined {
  switch (fieldName) {
    case 'Title':          return 'title';
    case 'Series':         return 'series';
    case 'Developer':      return 'developer';
    case 'Publisher':      return 'publisher';
    case 'Status':         return 'status';
    case 'Extreme':        return 'extreme';
    case 'Genre':          return 'genre';
    case 'Source':         return 'source';
    case 'Launch Command': return 'launchCommand';
    case 'Notes':          return 'notes';
    case 'Author Notes':   return 'authorNotes';
    default:               return undefined;
  }
}
