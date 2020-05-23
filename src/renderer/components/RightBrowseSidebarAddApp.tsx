import { AdditionalApp } from '@database/entity/AdditionalApp';
import { LangContainer } from '@shared/lang';
import * as React from 'react';
import { LangContext } from '../util/lang';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';

export type RightBrowseSidebarAddAppProps = {
  /** Additional Application to show and edit */
  addApp: AdditionalApp;
  /** Called when a field is edited */
  onEdit?: () => void;
  /** Called when a field is edited */
  onDelete?: (addAppId: string) => void;
  /** Called when the launch button is clicked */
  onLaunch?: (addAppId: string) => void;
  /** If the editing is disabled (it cant go into "edit mode") */
  editDisabled?: boolean;
};

export interface RightBrowseSidebarAddApp {
  context: LangContainer;
}

/** Displays an additional application for a game in the right sidebar of BrowsePage. */
export class RightBrowseSidebarAddApp extends React.Component<RightBrowseSidebarAddAppProps> {
  onNameEditDone            = this.wrapOnTextChange((addApp, text) => { addApp.name = text; });
  onApplicationPathEditDone = this.wrapOnTextChange((addApp, text) => { addApp.applicationPath = text; });
  onLaunchCommandEditDone   = this.wrapOnTextChange((addApp, text) => { addApp.launchCommand = text; });
  onAutoRunBeforeChange     = this.wrapOnCheckBoxChange((addApp) => { addApp.autoRunBefore = !addApp.autoRunBefore; });
  onWaitForExitChange       = this.wrapOnCheckBoxChange((addApp) => { addApp.waitForExit = !addApp.waitForExit; });

  render() {
    const strings = this.context.browse;
    const { addApp, editDisabled } = this.props;
    return (
      <div className='browse-right-sidebar__additional-application'>
        {/* Title & Launch Button */}
        <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-name'>
          <InputField
            text={addApp.name}
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
            {/* Auto Run Before */}
            <div className='browse-right-sidebar__row'>
              <div
                className='browse-right-sidebar__row__check-box-wrapper'
                onClick={this.onAutoRunBeforeChange}>
                <CheckBox
                  className='browse-right-sidebar__row__check-box'
                  checked={addApp.autoRunBefore} />
                <p> {strings.autoRunBefore}</p>
              </div>
            </div>
            {/* Wait for Exit */}
            <div className='browse-right-sidebar__row'>
              <div
                className='browse-right-sidebar__row__check-box-wrapper'
                onClick={this.onWaitForExitChange}>
                <CheckBox
                  className='browse-right-sidebar__row__check-box'
                  checked={addApp.waitForExit} />
                <p> {strings.waitForExit}</p>
              </div>
              {/* Delete Button */}
              { !editDisabled ? (
                <ConfirmElement
                  onConfirm={this.onDeleteClick}
                  children={this.renderDeleteButton}
                  extra={strings} />
              ) : undefined}
            </div>
          </>
        ) }
      </div>
    );
  }

  renderDeleteButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['browse']>): JSX.Element {
    const className = 'browse-right-sidebar__additional-application__delete-button';
    return (
      <div
        className={className + ((activationCounter > 0) ? ` ${className}--active simple-vertical-shake` : '')}
        title={extra.deleteAdditionalApplication}
        onClick={activate}
        onMouseLeave={reset}>
        <OpenIcon icon='trash' />
      </div>
    );
  }

  onLaunchClick = (): void => {
    if (this.props.onLaunch) {
      this.props.onLaunch(this.props.addApp.id);
    }
  }

  onDeleteClick = (): void => {
    if (this.props.onDelete) {
      this.props.onDelete(this.props.addApp.id);
    }
  }

  onEdit(): void {
    if (this.props.onEdit) {
      this.props.onEdit();
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone callback (this is to reduce redundancy). */
  wrapOnTextChange(func: (addApp: AdditionalApp, text: string) => void): (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => void {
    return (event) => {
      const addApp = this.props.addApp;
      if (addApp) {
        func(addApp, event.currentTarget.value);
        this.forceUpdate();
      }
    };
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy). */
  wrapOnCheckBoxChange(func: (addApp: AdditionalApp) => void) {
    return () => {
      if (!this.props.editDisabled) {
        func(this.props.addApp);
        this.onEdit();
        this.forceUpdate();
      }
    };
  }

  static contextType = LangContext;
}
