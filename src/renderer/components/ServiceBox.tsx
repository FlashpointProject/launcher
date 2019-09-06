import { remote } from 'electron';
import * as React from 'react';
import { setInterval } from 'timers';
import { IBackgroundService, IBackgroundServicesAction, IBackProcessInfo, ProcessState, ProcessAction } from '../../shared/background/interfaces';
import { ILogEntry } from '../../shared/Log/interface';
import { escapeHTML, formatTime, padLines, timeChars } from '../../shared/Log/LogCommon';
import { memoizeOne } from '../../shared/memoize';
import { LogData } from './LogData';

export type ServiceBoxProps = {
  /** Service to use */
  service: IBackgroundService;
};

export type ServiceBoxState = {
  /** Uptime counter for this service */
  uptime: number;
}

/** Title bar of the window (the top-most part of the window). */
export class ServiceBox extends React.Component<ServiceBoxProps, ServiceBoxState> {
  /** Keeps the uptime counter updated */
  private interval: NodeJS.Timeout | undefined;
  /** Memo of stringified service logs to pass to LogData during render */
  stringifyServiceLogEntriesMemo = memoizeOne(this.stringifySeviceLogEntries.bind(this));

  constructor(props : ServiceBoxProps, state : ServiceBoxState) {
    super(props, state);
    this.state = {
      uptime: Date.now() - props.service.startTime
    };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      const newUptime = Date.now() - this.props.service.startTime;
      if ((newUptime - this.state.uptime) / 1000) {
        this.setState( {uptime: newUptime} );
      }
    }, 50);
  }

  componentWillUnmount() {
    if (this.interval) { clearInterval(this.interval); }
  }

  render() {
    const { service } = this.props;
    const { uptime } = this.state;
    const uptimeString = formatMsTime(uptime);
    const logData = this.getLogString(service.name);

    return (
      <div>
        <div className='service-box'>
          <div className='service-box__top'>
            <div className='service-box__title'>
              <p>{service.name}</p>
            </div>
            {service.info ? (
              <div className='service-box__filename'>
                {service.info.filename}
              </div>
            ): undefined}
            <div className='service-box__status'>
              {service.state === ProcessState.RUNNING ?
                'Running (' + service.pid + ')' :
                service.state === ProcessState.KILLING ?
                  'Killing (' + service.pid + ')' :
                  'Stopped'}
            </div>
          </div>
          <div className='service-box__bottom'>
            <div className='service-box__bottom__buttons'>
              { service.state === ProcessState.RUNNING ? (
                <input
                  type='button'
                  value='Stop'
                  className='simple-button'
                  title='Stop the running service'
                  onClick={() => { this.sendAction({name: service.name, action: ProcessAction.STOP}); }}/>
              ) : (
                <input
                    type='button'
                    value='Start'
                    className='simple-button'
                    title='Start the stopped service'
                    disabled={service.state != ProcessState.STOPPED}
                    onClick={() => { this.sendAction({name: service.name, action: ProcessAction.START}); }}/>
              )}
              <input
                  type='button'
                  value='Restart'
                  className='simple-button'
                  title='Restart the service'
                  onClick={() => { this.sendAction({name: service.name, action: ProcessAction.RESTART}); }}/>
              {service.info ? (
              <input
                  type='button'
                  value='Details'
                  className='simple-button'
                  title='Show details of service'
                  onClick={() => { if (service) { this.onDetailsClick(service.info); } }}/>
              ) : undefined}
            </div>
            <div className='service-box__bottom__uptime'>
              { service.state === ProcessState.RUNNING ? (
                <p>{uptimeString}</p>
              ) : undefined }
            </div>
          </div>
          <LogData
            className='service-box__log'
            logData={logData}
            isLogDataHTML={true} />
        </div>
      </div>
    );
  }

  sendAction = (data: IBackgroundServicesAction): void => {
    window.External.backgroundServices.sendAction(data);
  };

  onDetailsClick = (info: IBackProcessInfo | undefined): void => {
    if (info) {
      remote.dialog.showMessageBox({
        type: 'info',
        title: 'Service Details',
        message:  'Path: ' + info.path +
                  '\nFilename: ' + info.filename +
                  '\nArguments: ' + info.arguments +
                  '\nKill on Exit: ' + info.kill,
        buttons: ['Ok']
      } );
    }
  };

  getLogString(source: string) {
    const logEntries = Object.assign([], window.External.log.entries);
    let filter : any = {};
    filter[source] = true;
    return this.stringifyServiceLogEntriesMemo(logEntries);
  }

  stringifySeviceLogEntries(entries: ILogEntry[]): string {
    let str = '';
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.source === this.props.service.name) {
        str += `<span class="log__time-stamp">[${formatTime(new Date(entry.timestamp))}]</span> `;
        str += padLines(escapeHTML(entry.content), timeChars + 2);
        str += '\n';
      }
    }
    return str;
  }
}

function formatMsTime(ms: number): string {
  let hours = String(Math.floor((ms / (1000 * 60 * 60)) % 24));
  let mins = String(Math.floor((ms / (1000 * 60)) % 60));
  let secs = String(Math.floor((ms / 1000) % 60));

  hours = (hours.length < 2) ? '0' + hours : hours;
  mins = (mins.length < 2) ? '0' + mins : mins;
  secs = (secs.length < 2) ? '0' + secs : secs;

  return hours + ':' + mins + ':' + secs;
}

