import * as React from 'react';
import { LangContext } from '../util/lang';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { AdditionalApp, LangContainer } from 'flashpoint-launcher';

export type RightBrowseSidebarAddAppProps = {
  /** Additional Application to show and edit */
  addApp: AdditionalApp;
  /** Called when a field is edited */
  onEdit?: (addApp: AdditionalApp) => void;
  /** Called when a field is edited */
  onDelete?: (addAppId: string) => void;
  /** Called when the launch button is clicked */
  onLaunch?: (addAppId: string) => void;
  /** If the editing is disabled (it cant go into "edit mode") */
  editDisabled?: boolean;
};

function DeleteButton({ confirm, extra }: ConfirmElementArgs<LangContainer['browse']>): React.JSX.Element {
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

export function RightBrowseSidebarAddApp(props: RightBrowseSidebarAddAppProps) {
  const { addApp, editDisabled, onDelete, onLaunch, onEdit } = props;
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.browse;

  const wrapOnTextChange = (func: (addApp: AdditionalApp, text: string) => void) => {
    return (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
      if (addApp) {
        func(addApp, event.currentTarget.value);
      }
    };
  };

  const wrapOnCheckBoxChange = (func: (addApp: AdditionalApp) => void) => {
    return () => {
      if (!editDisabled) {
        func(addApp);
      }
    };
  };

  const onNameEditDone            = wrapOnTextChange((addApp, text) => { if (onEdit) { onEdit({ ...addApp, name: text }); }});
  const onApplicationPathEditDone = wrapOnTextChange((addApp, text) => { if (onEdit) { onEdit({ ...addApp, applicationPath: text }); }});
  const onLaunchCommandEditDone   = wrapOnTextChange((addApp, text) => { if (onEdit) { onEdit({ ...addApp, launchCommand: text }); }});
  const onAutoRunBeforeChange     = wrapOnCheckBoxChange((addApp) => { if (onEdit) { onEdit({ ...addApp, autoRunBefore: !addApp.autoRunBefore }); }});
  const onWaitForExitChange       = wrapOnCheckBoxChange((addApp) => { if (onEdit) { onEdit({ ...addApp, waitForExit: !addApp.waitForExit });  }});

  const onLaunchClick = (): void => {
    if (onLaunch) {
      onLaunch(addApp.id);
    }
  };

  const onDeleteClick = (): void => {
    if (onDelete) {
      onDelete(addApp.id);
    }
  };

  return (
    <div className='browse-right-sidebar__additional-application'>
      {/* Title & Launch Button */}
      <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-name'>
        <InputField
          text={addApp.name}
          placeholder={strings.noName}
          onChange={onNameEditDone}
          editable={!editDisabled} />
        <input
          type='button'
          className='simple-button'
          value={strings.launch}
          onClick={onLaunchClick}/>
      </div>
      { editDisabled ? undefined : (
        <>
          {/* Application Path */}
          <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
            <p>{strings.applicationPath}: </p>
            <InputField
              text={addApp.applicationPath}
              placeholder={strings.noApplicationPath}
              onChange={onApplicationPathEditDone}
              editable={!editDisabled} />
          </div>
          {/* Launch Command */}
          <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
            <p>{strings.launchCommand}: </p>
            <InputField
              text={addApp.launchCommand}
              placeholder={strings.noLaunchCommand}
              onChange={onLaunchCommandEditDone}
              editable={!editDisabled} />
          </div>
          {/* Auto Run Before */}
          <div className='browse-right-sidebar__row'>
            <div
              className='browse-right-sidebar__row__check-box-wrapper'
              onClick={onAutoRunBeforeChange}>
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
              onClick={onWaitForExitChange}>
              <CheckBox
                className='browse-right-sidebar__row__check-box'
                checked={addApp.waitForExit} />
              <p> {strings.waitForExit}</p>
            </div>
            {/* Delete Button */}
            { !editDisabled ? (
              <ConfirmElement
                message={allStrings.dialog.deleteAddApp}
                onConfirm={onDeleteClick}
                render={DeleteButton}
                extra={strings} />
            ) : undefined}
          </div>
        </>
      ) }
    </div>
  );
}
