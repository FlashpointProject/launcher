import { BackIn, BackOut } from '@shared/back/types';
import { ArgumentTypesOf } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { LogLevel } from '@shared/Log/interface';
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
const sourceLabels = [
  'Background Services',
  'Curation',
  'Game Launcher',
  'Language',
  'Launcher',
  'Log Watcher',
  'Server',
  'Extensions',
];
const levelLabels = [
  LogLevel[0],
  LogLevel[1],
  LogLevel[2],
  LogLevel[3],
  LogLevel[4],
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
    const sourceFilter = { ...this.props.preferencesData.showLogSource };
    const levelFilter  = { ...this.props.preferencesData.showLogLevel  };
    return this.stringifyLogEntriesMemo(logEntries, sourceFilter, levelFilter);
  }

  componentDidMount() {
    window.Shared.back.registerAny(this.onMessage);
  }

  componentWillUnmount() {
    window.Shared.back.unregisterAny(this.onMessage);
  }

  render() {
    const strings = this.context.logs;
    const { preferencesData: { showLogSource, showLogLevel } } = this.props;
    const logData = this.getLogString();
    return (
      <div className='log-page'>
        {/* Bar */}
        <div className='log-page__bar'>
          {/* Left */}
          <div className='log-page__bar__wrap'>
            <div className='log-page__bar__row'>
              <Dropdown text={strings.filters}>
                { sourceLabels.map((label, index) => (
                  <label
                    key={index}
                    className='log-page__dropdown-item'>
                    <div className='simple-center'>
                      <input
                        type='checkbox'
                        checked={getBoolean(showLogSource[label])}
                        onChange={() => this.onSourceCheckboxClick(index)}
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
              <Dropdown text={strings.logLevels}>
                { levelLabels.map((label, index) => (
                  <label
                    key={index}
                    className='log-page__dropdown-item'>
                    <div className='simple-center'>
                      <input
                        type='checkbox'
                        checked={getBoolean(showLogLevel[index as LogLevel])}
                        onChange={() => this.onLevelCheckboxClick(index)}
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
          </div>
          {/* Right */}
          <div className='log-page__bar__wrap log-page__bar__right'>
            <div>
              <div className='log-page__bar__right__inner'>
                {/* Upload Logs Button */}
                <div className='log-page__bar__wrap'>
                  <div className='simple-center'>
                    <input
                      type='button'
                      disabled={this.state.uploading || this.state.uploaded}
                      value={this.state.uploaded ? strings.copiedToClipboard : strings.uploadLog}
                      onClick={this.onUploadClick}
                      className='simple-button simple-center__vertical-inner log-page__upload-log' />
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
      window.Shared.back.request(BackIn.UPLOAD_LOG)
      .then((data) => {
        this.setState({ uploaded: true, uploading: false });
        if (data) {
          // Write log URL to clipboard
          clipboard.writeText(data);
        }
      });
    } else {
      this.setState({ uploading: false });
    }
  }

  onSourceCheckboxClick = (index: number): void => {
    const label = sourceLabels[index];
    const { showLogSource } = this.props.preferencesData;
    updatePreferencesData({
      showLogSource: {
        ...showLogSource,
        [label]: !getBoolean(showLogSource[label]),
      },
    });
  }

  onLevelCheckboxClick = (index: number): void => {
    const { showLogLevel } = this.props.preferencesData;
    updatePreferencesData({
      showLogLevel: {
        ...showLogLevel,
        [index]: !getBoolean(showLogLevel[index as LogLevel]),
      },
    });
  }

  onMessage: Parameters<typeof window.Shared.back.registerAny>[0] = (event, type) => {
    if (type === BackOut.LOG_ENTRY_ADDED) { this.forceUpdate(); }
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
  return (
    // Only compare lengths of log entry arrays (to save performance)
    (newArgs[0].length === prevArgs[0].length) &&
    // Do a proper compare of the filters
    shallowStrictEquals(newArgs[1], prevArgs[1]) &&
    shallowStrictEquals(newArgs[2], prevArgs[2])
  );
}
