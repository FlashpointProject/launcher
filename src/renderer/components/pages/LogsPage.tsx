import { BackIn, BackOut, UploadLogResponse, WrappedResponse } from '@shared/back/types';
import { ArgumentTypesOf } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { stringifyLogEntries } from '@shared/Log/LogCommon';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { shallowStrictEquals } from '@shared/Util';
import { clipboard, remote } from 'electron';
import * as React from 'react';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { LangContext } from '../../util/lang';
import { Dropdown } from '../Dropdown';
import { LogData } from '../LogData';

type OwnProps = {};

export type LogsPageProps = OwnProps & WithPreferencesProps;

const urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/;
const labels = [
  'Background Services',
  'Game Launcher',
  'Language',
  'Redirector',
  'Server',
  'Curation',
  'Log Watcher',
];

export type LogsPageState = {
  /** Whether an upload has completed */
  uploaded: boolean;
  /** Whether an upload is in progress */
  uploading: boolean;
}

export interface LogsPage {
  context: LangContainer;
}

/** Page displaying this launcher's log. */
export class LogsPage extends React.Component<LogsPageProps, LogsPageState> {
  stringifyLogEntriesMemo = memoizeOne(stringifyLogEntries, stringifyLogEntriesEquals);

  constructor(props: LogsPageProps) {
    super(props);
    this.state = {
      uploaded: false,
      uploading: false
    };
  }

  getLogString() {
    const logEntries = [ ...window.Shared.log.entries ];
    const filter = { ...this.props.preferencesData.showLogSource };
    return this.stringifyLogEntriesMemo(logEntries, filter);
  }

  componentDidMount() {
    window.Shared.back.on('message', this.onMessage);
  }

  componentWillUnmount() {
    window.Shared.back.off('message', this.onMessage);
  }

  render() {
    const strings = this.context.logs;
    const { preferencesData: { showLogSource } } = this.props;
    const logData = this.getLogString();
    return (
      <div className='log-page'>
        {/* Bar */}
        <div className='log-page__bar'>
          {/* Left */}
          <div className='log-page__bar__wrap'>
            <Dropdown text={strings.filters}>
              { labels.map((label, index) => (
                <label
                  key={index}
                  className='log-page__dropdown-item'>
                  <div className='simple-center'>
                    <input
                      type='checkbox'
                      checked={getBoolean(showLogSource[label])}
                      onChange={() => this.onCheckboxClick(index)}
                      className='simple-center__vertical-inner' />
                  </div>
                  <div className='simple-center'>
                    <p className='simple-center__vertical-inner log-page__dropdown-item-text'>
                      {label}
                    </p>
                  </div>
                </label>
              )) }
            </Dropdown>
          </div>
          {/* Right */}
          <div className='log-page__bar__wrap log-page__bar__right'>
            <div>
              <div className='log-page__bar__right__inner'>
                {/* Copy Button */}
                <div className='log-page__bar__wrap'>
                  <div>
                    <input
                      type='button'
                      value={strings.copyText}
                      onClick={this.onCopyClick}
                      className='simple-button simple-center__vertical-inner' />
                  </div>
                </div>
                {/* Clear Button */}
                <div className='log-page__bar__wrap'>
                  <div className='simple-center'>
                    <input
                      type='button'
                      value={strings.clearLog}
                      onClick={this.onClearClick}
                      className='simple-button simple-center__vertical-inner' />
                  </div>
                </div>
                {/* Copy 404 URLs Button */}
                <div className='log-page__bar__wrap'>
                  <div className='simple-center'>
                    <input
                      type='button'
                      value={strings.copy404Urls}
                      onClick={this.onCopy404Click}
                      className='simple-button simple-center__vertical-inner' />
                  </div>
                </div>
                {/* Upload Logs Button */}
                <div className='log-page__bar__wrap'>
                  <div className='simple-center'>
                    <input
                      type='button'
                      disabled={this.state.uploading || this.state.uploaded}
                      value={this.state.uploaded ? strings.copiedToClipboard : strings.uploadLog}
                      onClick={this.onUploadClick}
                      className='simple-button simple-center__vertical-inner' />
                  </div>
                </div>
                {/* Add more right stuff here ... */}
              </div>
            </div>
          </div>
        </div>
        {/* Content */}
        <LogData
          className='log-page__content'
          logData={logData}
          isLogDataHTML={true} />
      </div>
    );
  }

  onCopyClick = (): void => {
    if (!navigator.clipboard) { throw new Error('Clipboard API is not available.'); }
    const logData = this.getLogString();
    navigator.clipboard.writeText(parseHtmlToText(logData));
  }

  onClearClick = (): void => {
    window.Shared.log.offset += window.Shared.log.entries.length;
    window.Shared.log.entries = [];
    this.forceUpdate();
  }

  onCopy404Click = (): void => {
    // Store found URLs
    const urls: string[] = [];
    for (const entry of window.Shared.log.entries) {
      // All 404 entries start with 404
      if (entry && entry.content.startsWith('404')) {
        // Extract URL with regex
        const match = urlRegex.exec(entry.content);
        if (match && match.length > 0) {
          urls.push(match[1]);
        }
      }
    }
    // Copy with each URL on a new line
    clipboard.writeText(urls.join('\n'));
  }

  onUploadClick = async (): Promise<void> => {
    this.setState({ uploading: true });
    const strings = this.context;
    // IMPORTANT - Make sure they want to *publically* post their info
    const res = await remote.dialog.showMessageBox({
      title: strings.dialog.areYouSure,
      message: strings.dialog.uploadPrivacyWarning,
      cancelId: 1,
      buttons: [strings.misc.yes, strings.misc.no]
    });
    if (res.response === 0) {
      // Ask backend to upload logs, sends back a log URL
      window.Shared.back.send<UploadLogResponse, any>(BackIn.UPLOAD_LOG, undefined, (res) => {
        this.setState({ uploaded: true, uploading: false });
        if (res.data) {
          // Write log URL to clipboard
          clipboard.writeText(res.data);
        }
      });
    } else {
      this.setState({ uploading: false });
    }
  }

  onCheckboxClick = (index: number): void => {
    const label = labels[index];
    const { showLogSource } = this.props.preferencesData;
    updatePreferencesData({
      showLogSource: Object.assign(
        {},
        showLogSource,
        { [label]: !getBoolean(showLogSource[label]) }
      )
    });
  }

  onMessage = (response: WrappedResponse): void => {
    if (response.type === BackOut.LOG_ENTRY_ADDED) {
      this.forceUpdate();
    }
  }

  static contextType = LangContext;
}

/**
 * Parse a HTML string into plain text (potentially unsafe).
 * @param text HTML string.
 * @returns text representation of HTML.
 */
function parseHtmlToText(text: string): string {
  const element = document.createElement('div');
  element.innerHTML = text;
  return element.innerText;
}

/** Convert "boolean | undefined" to "boolean" (undefined is converted to true). */
function getBoolean(value?: boolean): boolean {
  return (value === undefined) ? true : value;
}

type ArgsType = ArgumentTypesOf<typeof stringifyLogEntries>;
function stringifyLogEntriesEquals(newArgs: ArgsType, prevArgs: ArgsType): boolean {
  return (newArgs[0].length === prevArgs[0].length) && // (Only compare lengths of log entry arrays)
         shallowStrictEquals(newArgs[1], prevArgs[1]); // (Do a proper compare of the filters)
}
