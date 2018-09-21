import * as React from 'react';
import { IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { EditableTextWrap } from './EditableTextWrap';
import { CheckBox } from './CheckBox';

export interface IBrowseSidebarAddAppProps {
  /** Additional Application to show and edit */
  addApp: IAdditionalApplicationInfo;
  /** Called when a field is edited */
  onEdit?: () => void;
  /** Called when the launch button is clicked */
  onLaunch?: (addApp: IAdditionalApplicationInfo) => void;
}

export class BrowseSidebarAddApp extends React.Component<IBrowseSidebarAddAppProps, {}> {
  private onNameEditDone            = this.wrapOnEditDone((addApp, text) => { addApp.name = text; });
  private onApplicationPathEditDone = this.wrapOnEditDone((addApp, text) => { addApp.applicationPath = text; });
  private onCommandLineEditDone     = this.wrapOnEditDone((addApp, text) => { addApp.commandLine = text; });
  private onAutoRunBeforeChange     = this.wrapOnCheckBoxChange((addApp, isChecked) => { addApp.autoRunBefore = isChecked; });
  private onWaitForExitChange       = this.wrapOnCheckBoxChange((addApp, isChecked) => { addApp.waitForExit = isChecked; });

  constructor(props: IBrowseSidebarAddAppProps) {
    super(props);
    this.onLaunchClick = this.onLaunchClick.bind(this);
  }

  render() {
    const addApp = this.props.addApp;
    return (
      <div className='browse-sidebar__additional-application'>
        <div className='browse-sidebar__row browse-sidebar__row--additional-applications-name'>
          <EditableTextWrap target={addApp} 
                            text={addApp.name} onEditDone={this.onNameEditDone}/>
          <input type="button" className="simple-button" value="Launch" onClick={this.onLaunchClick}/>
        </div>
        <div className='browse-sidebar__row browse-sidebar__row--one-line'>
          <p>Application Path: </p>
          <EditableTextWrap target={addApp} 
                            text={addApp.applicationPath} onEditDone={this.onApplicationPathEditDone}/>
        </div>
        <div className='browse-sidebar__row browse-sidebar__row--one-line'>
          <p>Command Line: </p>
          <EditableTextWrap target={addApp}
                            text={addApp.commandLine} onEditDone={this.onCommandLineEditDone}/>
        </div>
        <div className='browse-sidebar__row'>
          <CheckBox className='browse-sidebar__row__check-box'
                    checked={addApp.autoRunBefore} onChange={this.onAutoRunBeforeChange}/>
          <p> Auto Run Before</p>
        </div>
        <div className='browse-sidebar__row'>
          <CheckBox className='browse-sidebar__row__check-box'
                    checked={addApp.waitForExit} onChange={this.onWaitForExitChange}/>
          <p> Wait for Exit</p>
        </div>
      </div>
    );
  }

  private onLaunchClick(): void {
    if (this.props.onLaunch) {
      this.props.onLaunch(this.props.addApp);
    }
  }

  private onEdit(): void {
    if (this.props.onEdit) {
      this.props.onEdit();
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone calllback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (addApp: IAdditionalApplicationInfo, text: string) => void) {
    return (text: string) => {
      func(this.props.addApp, text);
      this.onEdit();
    }
  }

  /** Create a wrapper for a CheckBox's onChange calllback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (addApp: IAdditionalApplicationInfo, isChecked: boolean) => void) {
    return (isChecked: boolean) => {
      func(this.props.addApp, isChecked);
      this.onEdit();
    }
  }
}
