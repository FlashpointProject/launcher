import { CurateBox } from '@renderer/components/CurateBox';
import { WithCurateStateProps } from '@renderer/containers/withCurateState';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { EditCuration } from '@shared/curate/types';
import * as React from 'react';

type OwnProps = {

}

export type CuratePageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps & WithCurateStateProps

export function CuratePage(props: CuratePageProps) {
  const curation: EditCuration = {
    key: '',
    meta: {},
    addApps: [],
    content: [],
    screenshot: {
      data: undefined,
      rawData: undefined,
      exists: false,
      fileName: undefined,
      filePath: undefined,
      version: 0,
    },
    thumbnail: {
      data: undefined,
      rawData: undefined,
      exists: false,
      fileName: undefined,
      filePath: undefined,
      version: 0,
    },
    locked: false,
    delete: false,
    deleted: false,
  };

  return (
    <div className='curate-page'>
      <div className='curate-page__left'>
        @TODO LIST CURATIONS HERE
      </div>
      <div className='curate-page__center'>
        <CurateBox
          curation={curation}
          dispatch={props.dispatchCurate} />
      </div>
      <div className='curate-page__right'>
        @TODO ADD BUTTONS AND STUFF HERE
      </div>
    </div>
  );
}
