import { Game } from '@database/entity/Game';
import { LangContainer } from '@shared/lang';
import * as React from 'react';
import { LangContext } from '../util/lang';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';

export type RightBrowseSidebarChildProps = {
  /** Additional Application to show and edit */
  child: Game;
  /** Called when a field is edited */
  onEdit?: () => void;
  /** Called when a field is edited */
  onDelete?: (childId: string) => void;
  /** Called when the launch button is clicked */
  onLaunch?: (childId: string) => void;
  /** If the editing is disabled (it cant go into "edit mode") */
  editDisabled?: boolean;
};

export interface RightBrowseSidebarChild {
  context: LangContainer;
}

/** Displays an additional application for a game in the right sidebar of BrowsePage. */
export class RightBrowseSidebarChild extends React.Component<RightBrowseSidebarChildProps> {
  onNameEditDone            = this.wrapOnTextChange((addApp, text) => { addApp.title = text; });
  onApplicationPathEditDone = this.wrapOnTextChange((addApp, text) => { addApp.applicationPath = text; });
  onLaunchCommandEditDone   = this.wrapOnTextChange((addApp, text) => { addApp.launchCommand = text; });

  render() {
    const allStrings = this.context;
    const strings = allStrings.browse;
    const { child: addApp, editDisabled } = this.props;
    return (
      <div className='browse-right-sidebar__additional-application'>
        {/* Title & Launch Button */}
        <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-name'>
          <InputField
            text={addApp.title}
            placeholder={strings.noName}
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
            {/* Application Path */}
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>{strings.applicationPath}: </p>
              <InputField
                text={addApp.applicationPath}
                placeholder={strings.noApplicationPath}
                onChange={this.onApplicationPathEditDone}
                editable={!editDisabled} />
            </div>
            {/* Launch Command */}
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>{strings.launchCommand}: </p>
              <InputField
                text={addApp.launchCommand}
                placeholder={strings.noLaunchCommand}
                onChange={this.onLaunchCommandEditDone}
                editable={!editDisabled} />
            </div>
            {/* Wait for Exit */}
            <div className='browse-right-sidebar__row'>
              {/* Delete Button */}
              { !editDisabled ? (
                <ConfirmElement
                  message={allStrings.dialog.deleteAddApp}
                  onConfirm={this.onDeleteClick}
                  render={this.renderDeleteButton}
                  extra={strings} />
              ) : undefined}
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
      this.props.onLaunch(this.props.child.id);
    }
  }

  onDeleteClick = (): void => {
    if (this.props.onDelete) {
      this.props.onDelete(this.props.child.id);
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
      const addApp = this.props.child;
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
        func(this.props.child);
        this.onEdit();
        this.forceUpdate();
      }
    };
  }

  static contextType = LangContext;
}
