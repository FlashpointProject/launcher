import { SourceData } from '@database/entity/SourceData';
import { BackIn } from '@shared/back/types';
import { sizeToString } from '@shared/Util';
import { GameData } from 'flashpoint-launcher';
import * as React from 'react';
import { CheckBox } from './CheckBox';
import { CurateBoxRow } from './CurateBoxRow';
import { InputField } from './InputField';
import { SimpleButton } from './SimpleButton';

export type GameDataInfoProps = {
  data: GameData;
  sourceData: SourceData[];
  active: boolean;
  onActiveToggle: () => void;
  onUninstall: () => void;
  onUpdateTitle: (title: string) => void;
  update: () => void;
  delete: () => void;
}

export function GameDataInfo(props: GameDataInfoProps) {
  const { data } = props;
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
            <SimpleButton
              value='Uninstall'
              onClick={props.onUninstall}/>
          ) : ( props.sourceData.length > 0 ? (
            <SimpleButton
              onClick={() => {
                window.Shared.back.request(BackIn.DOWNLOAD_GAME_DATA, props.data.id)
                .then(() => {
                  props.update();
                });
              }}
              value='Download'/>
          ) :
            <SimpleButton
              disabled={true}
              value='Unavailable'/>
          )}
          <SimpleButton
            onClick={props.delete}
            value='Delete'/>
        </div>
      </div>
      <table className='curate-box-table game-data-info__table'>
        <tbody>
          <CurateBoxRow title='Date Added:'>
            {data.dateAdded}
          </CurateBoxRow>
          <CurateBoxRow title='Path:'>
            {data.path || <i>Not Downloaded</i>}
          </CurateBoxRow>
          <CurateBoxRow title='Size:'>
            {`${sizeToString(data.size)} (${data.size} bytes)`}
          </CurateBoxRow>
          <CurateBoxRow title='SHA256:'>
            {data.sha256}
          </CurateBoxRow>
        </tbody>
      </table>
    </div>
  );
}
