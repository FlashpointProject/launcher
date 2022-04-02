import { LangContainer } from '@shared/lang';
import * as React from 'react';
import { LangContext } from '../util/lang';
import { InputField } from './InputField';

export type RightBrowseSidebarExtraProps = {
  /** Extras to show and edit */
  // These two are explicitly non-nullable.
  extrasPath: string;
  extrasName: string;
  /** Called when the launch button is clicked */
  onLaunch?: (extrasPath: string) => void;
};

export interface RightBrowseSidebarExtra {
  context: LangContainer;
}

/** Displays an additional application for a game in the right sidebar of BrowsePage. */
export class RightBrowseSidebarExtra extends React.Component<RightBrowseSidebarExtraProps> {

  render() {
    const allStrings = this.context;
    const strings = allStrings.browse;
    return (
      <div className='browse-right-sidebar__additional-application'>
        {/* Title & Launch Button */}
        <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-name'>
          <InputField
            text={this.props.extrasName}
            placeholder={strings.noExtrasName}
            editable={false} />
          <input
            type='button'
            className='simple-button'
            value={strings.launch}
            onClick={this.onLaunchClick}/>
        </div>
      </div>
    );
  }

  onLaunchClick = (): void => {
    if (this.props.onLaunch) {
      this.props.onLaunch(this.props.extrasPath);
    }
  }

  static contextType = LangContext;
}
