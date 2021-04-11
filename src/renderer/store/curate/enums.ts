export enum CurateActionType {
  CREATE_CURATION = '@@curate/CREATE_CURATION',
  SET_CURRENT_CURATION = '@@curate/SET_CURRENT_CURATION',
  NEW_ADDAPP = '@@curate/ADD_CURATION',
  EDIT_CURATION_META = '@@curate/EDIT_CURATION_META',
  SET_ALL_CURATIONS = '@@curate/SET_ALL_CURATIONS',
  APPLY_DELTA = '@@curate/APPLY_DELTA',
  ADD_TAG = '@@curate/ADD_TAG',
  REMOVE_TAG = '@@curate/REMOVE_TAG',
  EDIT_ADDAPP = '@@curate/EDIT_ADDAPP',
  REMOVE_ADDAPP = '@@curate/REMOVE_ADDAPP',
  SET_WARNINGS = '@@curate/SET_WARNINGS',
  IMPORT = '@@curate/IMPORT',
  SET_LOCK = '@@curate/SET_LOCK'
}
