import { Game } from '@database/entity/Game';
import { LangContainer } from '@shared/lang';
import * as React from 'react';
import { LangContext } from '../util/lang';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';

export type RightBrowseSidebarExtraProps = {
  /** Extras to show and edit */
  // These two are xplicitly non-nullable.
  extrasPath: string;
  extrasName: string;
  game: Game;
  /** Called when a field is edited */
  onEdit?: () => void;
  /** Called when a field is edited */
  onDelete?: (gameId: string) => void;
  /** Called when the launch button is clicked */
  onLaunch?: (gameId: string) => void;
  /** If the editing is disabled (it cant go into "edit mode") */
  editDisabled?: boolean;
};

export interface RightBrowseSidebarExtra {
  context: LangContainer;
}

/** Displays an additional application for a game in the right sidebar of BrowsePage. */
export class RightBrowseSidebarExtra extends React.Component<RightBrowseSidebarExtraProps> {
  onNameEditDone            = this.wrapOnTextChange((addApp, text) => { addApp.title = text; });
  onExtrasNameEditDone      = this.wrapOnTextChange((addApp, text) => { addApp.applicationPath = text; });
  onExtrasPathEditDone      = this.wrapOnTextChange((addApp, text) => { addApp.launchCommand = text; });

  render() {
    const allStrings = this.context;
    const strings = allStrings.browse;
    const { extrasPath, extrasName, editDisabled } = this.props;
    return (
      <div className='browse-right-sidebar__additional-application'>
        {/* Title & Launch Button */}
        <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-name'>
          <InputField
            text={extrasName}
            placeholder={strings.noExtrasName}
            onChange={this.onNameEditDone}
            editable={!editDisabled} />
          <input
            type='button'
            className='simple-button'
            value={strings.launch}
            onClick={this.onLaunchClick}/>
        </div>
        { editDisabled ? undefined : (
          <>
            {/* Launch Command */}
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>{strings.extras}: </p>
              <InputField
                text={extrasPath}
                placeholder={strings.noExtras}
                onChange={this.onExtrasPathEditDone}
                editable={!editDisabled} />
            </div>
          </>
        ) }
      </div>
    );
  }

  renderDeleteButton({ confirm, extra }: ConfirmElementArgs<LangContainer['browse']>): JSX.Element {
    const className = 'browse-right-sidebar__additional-application__delete-button';
    return (
      <div
        className={className}
        title={extra.deleteAdditionalApplication}
        onClick={confirm} >
        <OpenIcon icon='trash' />
      </div>
    );
  }

  onLaunchClick = (): void => {
    if (this.props.onLaunch) {
      this.props.onLaunch(this.props.game.id);
    }
  }

  onDeleteClick = (): void => {
    if (this.props.onDelete) {
      this.props.onDelete(this.props.game.id);
    }
  }

  onEdit(): void {
    if (this.props.onEdit) {
      this.props.onEdit();
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone callback (this is to reduce redundancy). */
  wrapOnTextChange(func: (addApp: Game, text: string) => void): (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => void {
    return (event) => {
      const addApp = this.props.game;
      if (addApp) {
        func(addApp, event.currentTarget.value);
        this.forceUpdate();
      }
    };
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy). */
  wrapOnCheckBoxChange(func: (addApp: Game) => void) {
    return () => {
      if (!this.props.editDisabled) {
        func(this.props.game);
        this.onEdit();
        this.forceUpdate();
      }
    };
  }

  static contextType = LangContext;
}
