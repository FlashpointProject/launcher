import { MetaEdit, MetaEditMeta } from "@shared/interfaces";
import { Coerce } from "@shared/utils/Coerce";
import { IObjectParserProp, ObjectParser } from "@shared/utils/ObjectParser";

const { str, strToBool } = Coerce;

export function parseMetaEdit(data: any, onError?: (error: string) => void): MetaEdit {
  const parser = new ObjectParser({
    input: data,
    onError: onError && ((e) => { onError(`Error while parsing Exec Mappings: ${e.toString()}`); })
  });

  const parsed: MetaEdit = {
    meta: parseMetaEditMeta(parser.prop('meta')),
    launcherVersion: '',
  };

  parser.prop('launcherVersion', v => parsed.launcherVersion = str(v));

  return parsed;
}


function parseMetaEditMeta(parser: IObjectParserProp<any>) : MetaEditMeta {
  const parsed: MetaEditMeta = {
    id: '',
    parentGameId: undefined,
  };

  parser.prop('id',                  v => parsed.id                  = str(v));
  parser.prop('parentGameId',        v => parsed.parentGameId        = (v !== undefined) ? str(v) : undefined, true);
  parser.prop('title',               v => parsed.title               = str(v), true);
  parser.prop('alternateTitles',     v => parsed.alternateTitles     = str(v), true);
  parser.prop('series',              v => parsed.series              = str(v), true);
  parser.prop('developer',           v => parsed.developer           = str(v), true);
  parser.prop('publisher',           v => parsed.publisher           = str(v), true);
  parser.prop('dateAdded',           v => parsed.dateAdded           = str(v), true);
  parser.prop('dateModified',        v => parsed.dateModified        = str(v), true);
  parser.prop('platform',            v => parsed.platform            = str(v), true);
  parser.prop('broken',              v => parsed.broken              = strToBool(v + ''), true);
  parser.prop('extreme',             v => parsed.extreme             = strToBool(v + ''), true);
  parser.prop('playMode',            v => parsed.playMode            = str(v), true);
  parser.prop('status',              v => parsed.status              = str(v), true);
  parser.prop('notes',               v => parsed.notes               = str(v), true);
  parser.prop('source',              v => parsed.source              = str(v), true);
  parser.prop('applicationPath',     v => parsed.applicationPath     = str(v), true);
  parser.prop('launchCommand',       v => parsed.launchCommand       = str(v), true);
  parser.prop('releaseDate',         v => parsed.releaseDate         = str(v), true);
  parser.prop('version',             v => parsed.version             = str(v), true);
  parser.prop('originalDescription', v => parsed.originalDescription = str(v), true);
  parser.prop('language',            v => parsed.language            = str(v), true);
  parser.prop('library',             v => parsed.library             = str(v), true);

  parser.prop('tags', v => parsed.tags = (v !== undefined) ? [] : undefined, true).arrayRaw(v => {
    if (!parsed.tags) { throw new Error('"parsed.tags" is missing (bug)'); }
    parsed.tags.push(str(v))
  });

  return parsed;
}
