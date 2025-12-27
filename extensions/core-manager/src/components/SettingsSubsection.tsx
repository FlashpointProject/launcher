import { GameMetadataSource } from 'flashpoint-launcher';
import { InputElement } from 'flashpoint-launcher-renderer';
import { updatePreferences } from 'flashpoint-launcher-renderer-ext/actions/preferences';
import { ConfigBox, ConfigBoxInput, ConfigSection, InputField } from 'flashpoint-launcher-renderer-ext/components';
import { useAppDispatch, useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import { selectRepoUrls, setRepoUrlsAction } from '../select';


export function SubsectionSettings() {
  const dispatch = useAppDispatch();
  const repoUrls = useAppSelector(selectRepoUrls);
  const metadataSources = useAppSelector(state => state.preferences.gameMetadataSources);
  const metadataSourceBoxes = metadataSources.map(source => {
    return <MetadataRow source={source} updateSource={(source) => {
      const sourceIdx = metadataSources.findIndex(s => s.id === source.id);
      if (sourceIdx > -1) {
        const newSources = [...metadataSources];
        newSources[sourceIdx] = source;
        dispatch(updatePreferences({
          gameMetadataSources: newSources
        }));
      }
    }} />;
  });

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
    <ConfigSection>
      <ConfigBox
        title='Metadata Sources'
        description='List of all Flashpoint metadata sources to pull from'
        swapChildren={true}>
        <div className='manager-source-table-list'>
          {metadataSourceBoxes}
        </div>
      </ConfigBox>
    </ConfigSection>
  </div>;
}

type MetadataRowProps = {
  source: GameMetadataSource;
  updateSource: (newSource: GameMetadataSource) => void;
}

function MetadataRow({ source, updateSource }: MetadataRowProps) {
  const onUpdateName = (event: React.ChangeEvent<InputElement>) => {
    updateSource({
      ...source,
      name: event.target.value
    });
  };
  const onUpdateBaseUrl = (event: React.ChangeEvent<InputElement>) => {
    updateSource({
      ...source,
      baseUrl: event.target.value
    });
  };
  const onUpdateFpfssUrl = (event: React.ChangeEvent<InputElement>) => {
    updateSource({
      ...source,
      fpfssUrl: event.target.value
    });
  };

  return (
    <table className='curate-box-table'>
      <tbody>
        <tr className='curate-box-row'>
          <th className='curate-box-row__title'>ID</th>
          <td className='curate-box-row__content'>{source.id}</td>
        </tr>
        <tr className='curate-box-row'>
          <th className='curate-box-row__title'>Name</th>
          <td className='curate-box-row__content'>
            <InputField
              text={source.name || ''}
              placeholder={'No Name'}
              onChange={onUpdateName}
              editable={true} />
          </td>
        </tr>
        <tr className='curate-box-row'>
          <th className='curate-box-row__title'>Base URL</th>
          <td className='curate-box-row__content'>
            <InputField
              text={source.baseUrl || ''}
              placeholder={'No Base URL'}
              onChange={onUpdateBaseUrl}
              editable={true} />
          </td>
        </tr>
        <tr className='curate-box-row'>
          <th className='curate-box-row__title'>Fpfss URL</th>
          <td className='curate-box-row__content'>
            <InputField
              text={source.fpfssUrl || ''}
              placeholder={'No Fpfss URL'}
              onChange={onUpdateFpfssUrl}
              editable={true} />
          </td>
        </tr>
      </tbody>
    </table>
  )
}