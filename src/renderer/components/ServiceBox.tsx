import { remote } from 'electron';
import * as React from 'react';
import { LangContainer } from 'src/shared/lang/types';
import { setInterval } from 'timers';
import { ILogEntry } from '../../shared/Log/interface';
import { escapeHTML, formatTime, padLines, timeChars } from '../../shared/Log/LogCommon';
import { memoizeOne } from '../../shared/memoize';
import { IBackProcessInfo, IService, IServiceAction, ProcessAction, ProcessState } from '../../shared/service/interfaces';
import { LangContext } from '../util/lang';
import { LogData } from './LogData';

export type ServiceBoxProps = {
  /** Service to use */
  service: IService;
};

export type ServiceBoxState = {
  /** Uptime counter for this service */
  uptime: number;
}

export interface ServiceBox {
  context: LangContainer;
}

/** Title bar of the window (the top-most part of the window). */
export class ServiceBox extends React.Component<ServiceBoxProps, ServiceBoxState> {
  /** Keeps the uptime counter updated */
  private interval: NodeJS.Timeout | undefined;
  /** Memo of stringified service logs to pass to LogData during render */
  stringifyServiceLogEntriesMemo = memoizeOne(this.stringifySeviceLogEntries.bind(this));

  static contextType = LangContext;

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
    const strings = this.context.developer;
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
                strings.running + ' (' + service.pid + ')' :
                service.state === ProcessState.KILLING ?
                  strings.killing + ' (' + service.pid + ')' :
                  strings.stopped}
            </div>
          </div>
          <div className='service-box__bottom'>
            <div className='service-box__bottom__buttons'>
              { service.state === ProcessState.RUNNING ? (
                <input
                  type='button'
                  value={strings.stop}
                  className='simple-button'
                  title={strings.stopDesc}
                  onClick={() => { this.sendAction({name: service.name, action: ProcessAction.STOP}); }}/>
              ) : (
                <input
                    type='button'
                    value={strings.start}
                    className='simple-button'
                    title={strings.startDesc}
                    disabled={service.state != ProcessState.STOPPED}
                    onClick={() => { this.sendAction({name: service.name, action: ProcessAction.START}); }}/>
              )}
              <input
                  type='button'
                  value={strings.restart}
                  className='simple-button'
                  title={strings.restartDesc}
                  onClick={() => { this.sendAction({name: service.name, action: ProcessAction.RESTART}); }}/>
              {service.info ? (
              <input
                  type='button'
                  value={strings.details}
                  className='simple-button'
                  title={strings.detailsDesc}
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

  sendAction = (data: IServiceAction): void => {
    window.External.services.sendAction(data);
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

