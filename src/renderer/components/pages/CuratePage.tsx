import { CurateBox } from '@renderer/components/CurateBox';
import { WithCurateStateProps } from '@renderer/containers/withCurateState';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { Curation } from '@renderer/store/curate/types';
import * as React from 'react';
import { CurateActionType } from '@renderer/store/curate/enums';

type OwnProps = {

}

export type CuratePageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps & WithCurateStateProps

export function CuratePage(props: CuratePageProps) {
  const curation: Curation | undefined = props.curate.curations[props.curate.current];

  // @DEBUG - Add a curation to test
  React.useEffect(() => {
    if (props.curate.curations.length === 0) {
      props.dispatchCurate({ type: CurateActionType.CREATE_CURATION, folder: 'sup' });
      props.dispatchCurate({ type: CurateActionType.SET_CURRENT_CURATION, index: 0 });
    }
  }, []);

  /*
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
  */

  return (
    <div className='curate-page'>
      <div className='curate-page__left'>
        @TODO LIST CURATIONS HERE
      </div>
      <div className='curate-page__center simple-scroll'>
        { curation ? (
          <CurateBox
            curation={curation}
            dispatch={props.dispatchCurate} />
        ) : (
          <div>
            No curation here.
          </div>
        )}
      </div>
      <div className='curate-page__right'>
        @TODO ADD BUTTONS AND STUFF HERE
      </div>
    </div>
  );
}
