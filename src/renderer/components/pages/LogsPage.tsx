import * as React from 'react';
import { LogData } from '../LogData';

interface ILogsPageProps {
  logData: string;
}

interface ILogsPageState {
}

export class LogsPage extends React.Component<ILogsPageProps, ILogsPageState> {
  constructor(props: ILogsPageProps) {
    super(props);
    this.state = {};
    this.onCopyClick = this.onCopyClick.bind(this);
    this.onClearClick = this.onClearClick.bind(this);
  }
  
  render() {
    return (
      <div className='log-page'>
        {/* Bar */}
        <div className='log-page__bar'>
          {/* Left */}
          <div className='log-page__bar__wrap'>
          </div>
          {/* Right */}
          <div className='log-page__bar__wrap log-page__bar__right'>
            <div>
              <div className='log-page__bar__right__inner'>
                {/* Copy Button */}
                <div className='log-page__bar__wrap'>
                  <div>
                    <input type='button' value='Copy Log Text' onClick={this.onCopyClick}
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
        <LogData className='log-page__content' logData={this.props.logData} />
      </div>
    );
  }

  private onCopyClick(): void {
    if (!navigator.clipboard) { throw new Error('Clipboard API is not available.'); }
    navigator.clipboard.writeText(parseHtmlToText(this.props.logData));
  }

  private onClearClick(): void {
    window.External.log.clearEntries();
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
