import * as React from 'react';
import { ArgumentTypesOf } from '../../../shared/interfaces';
import { stringifyLogEntries } from '../../../shared/Log/LogCommon';
import { LogRendererApi } from '../../../shared/Log/LogRendererApi';
import { memoizeOne } from '../../../shared/memoize';
import { shallowStrictEquals } from '../../../shared/Util';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { Dropdown } from '../Dropdown';
import { LogData } from '../LogData';

interface OwnProps {
}

export type ILogsPageProps = OwnProps & WithPreferencesProps;

const labels = [
  'Background Services',
  'Game Launcher',
  'Redirector',
  'Router',
];

export class LogsPage extends React.Component<ILogsPageProps> {
  private stringifyLogEntriesMemo = memoizeOne(stringifyLogEntries, stringifyLogEntriesEquals);

  constructor(props: ILogsPageProps) {
    super(props);
  }

  private getLogString() {
    const logEntries = Object.assign([], window.External.log.entries);
    const filter = Object.assign({}, this.props.preferencesData.showLogSource);
    return this.stringifyLogEntriesMemo(logEntries, filter);
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
                  <div className='simple-center'>
                    <input type='checkbox' checked={getBoolean(showLogSource[label])}
                           onChange={() => this.onCheckboxClick(index)}
                           className='simple-center__vertical-inner' />               
                  </div>
                  <div className='simple-center'>
                    <p className='simple-center__vertical-inner'>{label}</p>                  
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
        <LogData className='log-page__content' logData={logData} isLogDataHTML={true} />
      </div>
    );
  }

  private onCopyClick = (): void => {
    if (!navigator.clipboard) { throw new Error('Clipboard API is not available.'); }
    const logData = this.getLogString();
    navigator.clipboard.writeText(parseHtmlToText(logData));
  }

  private onClearClick = (): void => {
    window.External.log.clearEntries();
  }

  private onCheckboxClick = (index: number): void => {
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

  private onLogDataUpdate = (log: LogRendererApi): void => {
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
  return (newArgs[0].length === prevArgs[0].length) && // (Only compare lengths of log entry arrays)
         shallowStrictEquals(newArgs[1], prevArgs[1]); // (Do a proper compare of the filters)
}
