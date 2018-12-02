import * as React from 'react';
import { LogData } from '../LogData';

interface ILogsPageProps {
  logData: string;
}

export class LogsPage extends React.Component<ILogsPageProps> {
  render() {
    return (
      <div className='log-page'>
        <LogData logData={this.props.logData} />
      </div>
    );
  }
}
