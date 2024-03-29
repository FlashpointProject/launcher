import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { sizeToString } from '@shared/Util';
import { GameData } from 'flashpoint-launcher';
import * as React from 'react';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { CurateBoxRow } from './CurateBoxRow';
import { InputField } from './InputField';
import { SimpleButton } from './SimpleButton';

export type GameDataInfoProps = {
  data: GameData;
  active: boolean;
  onActiveToggle: () => void;
  onUninstall: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateParameters: (parameters: string) => void;
  onUpdateApplicationPath: (appPath: string) => void;
  onUpdateLaunchCommand: (lc: string) => void;
  update: () => void;
  delete: () => void;
}

export function GameDataInfo(props: GameDataInfoProps) {
  const { data } = props;
  const strings = React.useContext(LangContext);

  const renderUninstallButton = ({ confirm }: ConfirmElementArgs) => {
    return (
      <SimpleButton
        value='Uninstall'
        onClick={confirm}/>
    );
  };

  const renderDeleteButton = ({ confirm }: ConfirmElementArgs) => {
    return (
      <SimpleButton
        onClick={confirm}
        value='Delete'/>
    );
  };

  return (
    <div className='game-data-info'>
      <div className='game-data-info__top'>
        <InputField
          className='game-data-info__title'
          text={data.title}
          editable={true}
          onChange={(event) => {
            props.onUpdateTitle(event.target.value);
          }} />
        {/* <div className='game-data-info__title'>{data.title}</div> */}
        <div className='game-data-info__top-buttons'>
          { props.active && (
            <p>Active</p>
          )}
          <CheckBox checked={props.active}
            onToggle={props.onActiveToggle}/>
          { props.data.presentOnDisk ? (
            <ConfirmElement
              message={strings.dialog.uninstallGame}
              render={renderUninstallButton}
              onConfirm={props.onUninstall}/>
          ) : (
            <SimpleButton
              onClick={() => {
                window.Shared.back.request(BackIn.DOWNLOAD_GAME_DATA, props.data.id)
                .then(() => {
                  props.update();
                });
              }}
              value='Download'/>
          )}
          <ConfirmElement
            message={strings.dialog.deleteGameData}
            render={renderDeleteButton}
            onConfirm={props.delete}/>
        </div>
      </div>
      <table className='curate-box-table game-data-info__table'>
        <tbody>
          <CurateBoxRow title='Date Added'>
            {data.dateAdded}
          </CurateBoxRow>
          <CurateBoxRow title='Application Path'>
            <InputField
              text={data.applicationPath}
              editable={true}
              onChange={(event) => {
                props.onUpdateApplicationPath(event.target.value);
              }} />
          </CurateBoxRow>
          <CurateBoxRow title='Launch Command'>
            <InputField
              text={data.launchCommand}
              editable={true}
              onChange={(event) => {
                props.onUpdateLaunchCommand(event.target.value);
              }} />
          </CurateBoxRow>
          <CurateBoxRow title='Path'>
            {data.path || <i>Not Downloaded</i>}
          </CurateBoxRow>
          <CurateBoxRow title='Size'>
            {`${sizeToString(data.size)} (${data.size} bytes)`}
          </CurateBoxRow>
          <CurateBoxRow title='SHA256'>
            {data.sha256}
          </CurateBoxRow>
          <CurateBoxRow
            title='Mount Parameters:'>
            <InputField
              text={data.parameters || ''}
              editable={true}
              onChange={(event) => {
                props.onUpdateParameters(event.target.value);
              }} />
          </CurateBoxRow>
        </tbody>
      </table>
    </div>
  );
}
