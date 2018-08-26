import * as React from 'react';
import LogData from '../LogData';

interface ILogsPageProps {
  logData: string;
}

export default class LogsPage extends React.Component<ILogsPageProps> {
  render() {
    const { logData } = this.props;

    return (
      <LogData logData={logData} />
    );
  }
}
