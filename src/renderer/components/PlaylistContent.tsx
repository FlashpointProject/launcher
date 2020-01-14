import * as React from 'react';
import { GamePlaylist } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { LangContext } from '../util/lang';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';

export type PlaylistItemContentProps = {
  editingDisabled: boolean;
  editing: boolean;
  playlist: GamePlaylist;

  onDescriptionChange: (event: React.ChangeEvent<InputElement>) => void;
  OnFilenameChange: (event: React.ChangeEvent<InputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<InputElement>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PlaylistItemContent(props: PlaylistItemContentProps) {
  const strings = React.useContext(LangContext).playlist;

  let className = 'playlist-list-content';
  if (props.editing) { className += ' playlist-list-content--edit'; }

  return (
    <div className={className}>
      <div className='playlist-list-content__inner'>
        { props.editingDisabled ? undefined : (
          <div className='playlist-list-content__edit'>
            <div className='playlist-list-content__id'>
              <p className='playlist-list-content__id-pre'>{strings.filename}: </p>
              <div className='playlist-list-content__id-text'>
                <InputField
                  text={props.playlist.filename}
                  editable={props.editing && !props.editingDisabled}
                  onChange={props.OnFilenameChange}
                  onKeyDown={props.onKeyDown}
                  multiline={false} />
              </div>
            </div>
            <div className='playlist-list-content__buttons'>
              { props.editing ? (
                <>
                  {/* Save Button */}
                  <div
                    className='playlist-list-content__button playlist-list-content__button--confirm'
                    title={strings.saveDesc}
                    onClick={props.onSave}>
                    <OpenIcon icon='check' />
                  </div>
                  {/* Discard Button */}
                  <div
                    className='playlist-list-content__button playlist-list-content__button--warning'
                    title={strings.discardDesc}
                    onClick={props.onDiscard}>
                    <OpenIcon icon='x' />
                  </div>
                </>
              ) : (
                <>
                  {/* Edit Button */}
                  <div
                    className='playlist-list-content__button playlist-list-content__button--confirm'
                    title={strings.editDesc}
                    onClick={props.onEdit}>
                    <OpenIcon icon='pencil' />
                  </div>
                  {/* Delete Button */}
                  <ConfirmElement
                    onConfirm={props.onDelete}
                    children={renderDeleteButton}
                    extra={strings} />
                </>
              ) }
            </div>
          </div>
        ) }
        {/* Description */}
        <InputField
          text={props.playlist.description}
          placeholder={strings.noDescription}
          className='playlist-list-content__description'
          editable={props.editing && !props.editingDisabled}
          onChange={props.onDescriptionChange}
          onKeyDown={props.onKeyDown}
          multiline={true} />
      </div>
    </div>
  );
}

function renderDeleteButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['playlist']>): JSX.Element {
  return (
    <div
      className={
        'playlist-list-content__button playlist-list-content__button--warning' +
        ((activationCounter > 0) ? ' playlist-list-content__button--active simple-vertical-shake' : '')
      }
      title={extra.deleteDesc}
      onClick={activate}
      onMouseLeave={reset}>
      <OpenIcon icon='trash' />
    </div>
  );
}
