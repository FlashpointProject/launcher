import { ConfigBoxInput, ConfigSection } from 'flashpoint-launcher-renderer-ext/components';
import { useAppDispatch, useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import { selectRepoUrls, setRepoUrlsAction } from '../select';


export function SubsectionSettings() {
  const dispatch = useAppDispatch();
  const repoUrls = useAppSelector(selectRepoUrls);

  return <div className='manager-page-subsection'>
    <div className='manager-page-subsection-header'>Settings</div>
    <ConfigSection>
      <ConfigBoxInput
        title='Extension Repositories'
        description='Line seperated list of repository urls to check for Extensions'
        text={repoUrls}
        editable={true}
        multiline={true}
        onChange={(event) => {
          dispatch(setRepoUrlsAction(event.target.value));
        }}/>
    </ConfigSection>
  </div>;
}