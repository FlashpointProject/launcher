import { GameDataSource, GameMetadataSource } from 'flashpoint-launcher';
import { ConfirmDialogProps, InputElement } from 'flashpoint-launcher-renderer';
import { updatePreferences } from 'flashpoint-launcher-renderer-ext/actions/preferences';
import { ConfigBox, ConfigBoxInput, ConfigSection, InputField, SimpleButton } from 'flashpoint-launcher-renderer-ext/components';
import { useAppDispatch, useAppSelector, useConfirmDialog } from 'flashpoint-launcher-renderer-ext/hooks';
import { selectRepoUrls, setRepoUrlsAction } from '../select';


export function SubsectionSettings() {
  const dispatch = useAppDispatch();
  const { confirmDialog, openConfirmDialog } = useConfirmDialog();
  const repoUrls = useAppSelector(selectRepoUrls);
  const dataSources = useAppSelector(state => state.preferences.gameDataSources);
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
  const dataSourceBoxes = dataSources.map((data, idx) => {
    return <DataRow 
      data={data} 
      updateData={(data) => {
        const newDataSources = [...dataSources];
        newDataSources[idx] = data;
        dispatch(updatePreferences({
          gameDataSources: newDataSources
        }));
      }}
      removeData={() => {
        const newDataSources = [...dataSources];
        newDataSources.splice(idx, 1);
        dispatch(updatePreferences({
          gameDataSources: newDataSources
        }));
      }} 
      openConfirmDialog={openConfirmDialog} />;
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
    <ConfigSection>
      <ConfigBox
        title='Data Sources'
        description='List of all Flashpoint data sources to pull from'
        swapChildren={true}>
        <div>
          <div className='manager-source-table-list'>
            {dataSourceBoxes}
          </div>
          <SimpleButton
            value={'New Data Source'}
            onClick={() => {
              const newDataSources = [...dataSources];
              newDataSources.push({
                type: '',
                name: '',
                arguments: '',
              });
              dispatch(updatePreferences({ gameDataSources: newDataSources }));
            }}/>
        </div>
      </ConfigBox>
    </ConfigSection>
    {confirmDialog}
  </div>;
}

type DataRowProps = {
  data: GameDataSource;
  updateData: (newData: GameDataSource) => void;
  removeData: () => void;
  openConfirmDialog: (props: Omit<ConfirmDialogProps, 'onResult'>) => Promise<number>;
}

type MetadataRowProps = {
  source: GameMetadataSource;
  updateSource: (newSource: GameMetadataSource) => void;
}

function DataRow({ data, updateData, removeData, openConfirmDialog }: DataRowProps) {
  const onUpdateType = (event: React.ChangeEvent<InputElement>) => {
    updateData({
      ...data,
      type: event.target.value
    });
  };
  const onUpdateName = (event: React.ChangeEvent<InputElement>) => {
    updateData({
      ...data,
      name: event.target.value
    });
  };
  const onUpdateArguments = (event: React.ChangeEvent<InputElement>) => {
    updateData({
      ...data,
      arguments: event.target.value
    });
  };

  return (
    <>
      <table className='curate-box-table'>
        <tbody>
          <tr className='curate-box-row'>
            <th className='curate-box-row__title'>Type</th>
            <td className='curate-box-row__content'>
              <InputField
                text={data.type || ''}
                placeholder={'No Type'}
                onChange={onUpdateType}
                editable={true} />
            </td>
          </tr>
          <tr className='curate-box-row'>
            <th className='curate-box-row__title'>Name</th>
            <td className='curate-box-row__content'>
              <InputField
                text={data.name || ''}
                placeholder={'No Name'}
                onChange={onUpdateName}
                editable={true} />
            </td>
          </tr>
          <tr className='curate-box-row'>
            <th className='curate-box-row__title'>Arguments</th>
            <td className='curate-box-row__content'>
              <InputField
                text={data.arguments}
                placeholder={'No Arguments'}
                onChange={onUpdateArguments}
                editable={true} />
            </td>
          </tr>
        </tbody>
      </table>
      <SimpleButton 
        className='manager-data-delete-button'
        value='Delete'
        onClick={async () => {
          const res = await openConfirmDialog({
            message: 'Deleting data source, are you sure?',
            buttons: ['Yes', 'No'],
            cancelId: 1
          });
          if (res === 0) {
            removeData();
          }
        }} />
    </>
  );
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
  );
}