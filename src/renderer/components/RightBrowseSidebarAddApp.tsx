import * as React from 'react';
import { IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { CheckBox } from './CheckBox';
import { OpenIcon } from './OpenIcon';
import { InputField } from './InputField';

export interface IRightBrowseSidebarAddAppProps {
  /** Additional Application to show and edit */
  addApp: IAdditionalApplicationInfo;
  /** Called when a field is edited */
  onEdit?: () => void;
  /** Called when a field is edited */
  onDelete?: (addApp: IAdditionalApplicationInfo) => void;
  /** Called when the launch button is clicked */
  onLaunch?: (addApp: IAdditionalApplicationInfo) => void;
  /** If the editing is disabled (it cant go into "edit mode") */
  editDisabled?: boolean;
}

export class RightBrowseSidebarAddApp extends React.Component<IRightBrowseSidebarAddAppProps, {}> {
  private onNameEditDone            = this.wrapOnTextChange((addApp, text) => { addApp.name = text; });
  private onApplicationPathEditDone = this.wrapOnTextChange((addApp, text) => { addApp.applicationPath = text; });
  private onCommandLineEditDone     = this.wrapOnTextChange((addApp, text) => { addApp.commandLine = text; });
  private onAutoRunBeforeChange     = this.wrapOnCheckBoxChange((addApp) => { addApp.autoRunBefore = !addApp.autoRunBefore; });
  private onWaitForExitChange       = this.wrapOnCheckBoxChange((addApp) => { addApp.waitForExit = !addApp.waitForExit; });

  constructor(props: IRightBrowseSidebarAddAppProps) {
    super(props);
  }

  render() {
    const { addApp, editDisabled } = this.props;
    return (
      <div className='browse-right-sidebar__additional-application'>
        {/* Title & Launch Button */}
        <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-name'>
          <InputField text={addApp.name} placeholder='No Name'
                      onChange={this.onNameEditDone} canEdit={!editDisabled} />
          <input type="button" className="simple-button" value="Launch" onClick={this.onLaunchClick}/>
        </div>
        { editDisabled ? undefined : (
          <>
            {/* Application Path */}
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Application Path: </p>
              <InputField text={addApp.applicationPath} placeholder='No Application Path'
                          onChange={this.onApplicationPathEditDone} canEdit={!editDisabled} />
            </div>
            {/* Command Line */}
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Command Line: </p>
              <InputField text={addApp.commandLine} placeholder='No Command Line'
                          onChange={this.onCommandLineEditDone} canEdit={!editDisabled} />
            </div>
            {/* Auto Run Before */}
            <div className='browse-right-sidebar__row'>
              <div className='browse-right-sidebar__row__check-box-wrapper' onClick={this.onAutoRunBeforeChange}>
                <CheckBox className='browse-right-sidebar__row__check-box' checked={addApp.autoRunBefore} />
                <p> Auto Run Before</p>
              </div>
            </div>
            {/* Wait for Exit */}
            <div className='browse-right-sidebar__row'>
              <div className='browse-right-sidebar__row__check-box-wrapper' onClick={this.onWaitForExitChange}>
                <CheckBox className='browse-right-sidebar__row__check-box' checked={addApp.waitForExit} />
                <p> Wait for Exit</p>
              </div>
              {/* Delete Button */}
              { !editDisabled ? (
                <div className='browse-right-sidebar__additional-application__delete-button'
                    onClick={this.onDeleteClick}>
                  <OpenIcon icon='trash' />
                </div>            
              ) : undefined}
            </div>
          </>
        ) }
      </div>
    );
  }

  private onLaunchClick = (): void => {
    if (this.props.onLaunch) {
      this.props.onLaunch(this.props.addApp);
    }
  }

  private onDeleteClick = (): void => {
    if (this.props.onDelete) {
      this.props.onDelete(this.props.addApp);
    }
  }

  private onEdit(): void {
    if (this.props.onEdit) {
      this.props.onEdit();
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone callback (this is to reduce redundancy) */
  private wrapOnTextChange(func: (addApp: IAdditionalApplicationInfo, text: string) => void): (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => void {
    return (event) => {
      const addApp = this.props.addApp;
      if (addApp) {
        func(addApp, event.currentTarget.value);
        this.forceUpdate();
      }
    }
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (addApp: IAdditionalApplicationInfo) => void) {
    return () => {
      if (!this.props.editDisabled) {
        func(this.props.addApp);
        this.onEdit();
        this.forceUpdate();
      }
    }
  }
}
