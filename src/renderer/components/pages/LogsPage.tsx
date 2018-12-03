import * as React from 'react';
import { LogData } from '../LogData';
import { Dropdown } from '../Dropdown';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { LogRendererApi } from '../../../shared/Log/LogRendererApi';
import { memoizeOne } from '../../../shared/memoize';
import { stringifyLogEntries } from '../../../shared/Log/LogCommon';
import { ArgumentTypesOf } from '../../../shared/interfaces';

interface OwnProps {
}

export type ILogsPageProps = OwnProps & WithPreferencesProps;

interface ILogsPageState {
}

const labels = [
  'Background Services',
  'Game Launcher',
  'Redirector',
  'Router',
];

export class LogsPage extends React.Component<ILogsPageProps, ILogsPageState> {
  private stringifyLogEntriesMemo = memoizeOne(stringifyLogEntries, stringifyLogEntriesEquals);

  constructor(props: ILogsPageProps) {
    super(props);
    this.state = {};
    this.onCopyClick = this.onCopyClick.bind(this);
    this.onClearClick = this.onClearClick.bind(this);
    this.onCheckboxClick = this.onCheckboxClick.bind(this);
    this.onLogDataUpdate = this.onLogDataUpdate.bind(this);
  }

  private getLogString() {
    const logEntries = Object.assign([], window.External.log.entries);
    return this.stringifyLogEntriesMemo(logEntries);
  }

  componentDidMount() {
    window.External.log.on('change', this.onLogDataUpdate);
  }

  componentWillUnmount() {
    window.External.log.removeListener('change', this.onLogDataUpdate);
  }
  
  render() {
    const { preferencesData: { showLogSource } } = this.props;
    const logData = this.getLogString();
    return (
      <div className='log-page'>
        {/* Bar */}
        <div className='log-page__bar'>
          {/* Left */}
          <div className='log-page__bar__wrap'>
            <Dropdown text='Filters'>
              { labels.map((label, index) => (
                <label key={index}>
                  <input type='checkbox' checked={getBoolean(showLogSource[label])}
                         onChange={() => this.onCheckboxClick(index)} />
                  {label}
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
                    <input type='button' value='Copy Text' onClick={this.onCopyClick}
                           className='simple-button simple-center__vertical-inner' />
                  </div>
                </div>
                {/* Clear Button */}
                <div className='log-page__bar__wrap'>
                  <div className='simple-center'>
                    <input type='button' value='Clear Log' onClick={this.onClearClick}
                           className='simple-button simple-center__vertical-inner' />
                  </div>
                </div>
                {/* Add more right stuff here ... */}
              </div>            
            </div>
          </div>
        </div>
        {/* Content */}
        <LogData className='log-page__content' logData={logData} />
      </div>
    );
  }

  private onCopyClick(): void {
    if (!navigator.clipboard) { throw new Error('Clipboard API is not available.'); }
    const logData = this.getLogString();
    navigator.clipboard.writeText(parseHtmlToText(logData));
  }

  private onClearClick(): void {
    window.External.log.clearEntries();
  }

  private onCheckboxClick(index: number): void {
    const label = labels[index];
    const { showLogSource } = this.props.preferencesData;
    this.props.updatePreferences({
      showLogSource: Object.assign(
        {},
        showLogSource,
        { [label]: !getBoolean(showLogSource[label]) }
      )
    });
  }

  private onLogDataUpdate(log: LogRendererApi) {
    this.forceUpdate();
  }
}

/**
 * Parse a HTML string into plain text (potentially unsafe)
 * @param text HTML string
 * @returns text representation of HTML
 */
function parseHtmlToText(text: string): string {
  const element = document.createElement('div');
  element.innerHTML = text;
  return element.innerText;
}

function getBoolean(value?: boolean): boolean {
  return (value === undefined) ? true : value;
}

type ArgsType = ArgumentTypesOf<typeof stringifyLogEntries>;
function stringifyLogEntriesEquals(newArgs: ArgsType, prevArgs: ArgsType): boolean {
  return newArgs[0].length === prevArgs[0].length;
}
