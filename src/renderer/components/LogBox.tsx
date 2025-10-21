import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { LogLevel } from '@shared/Log/interface';
import { formatTime, padLines } from '@shared/Log/LogCommon';
import { calcScale } from '@shared/Util';
import { ILogEntry } from 'flashpoint-launcher';
import { List, RowComponentProps } from 'react-window';

const timestampLength = '[HH:MM:SS] '.length;
const logLevelLength = 5;

export type LogBoxProps = {
  logs: ILogEntry[];
  longestSource: number;
}

type RowProps = {
  logs: ILogEntry[];
  longestSource: number;
}

function LogRow({ index, style, logs, longestSource }: RowComponentProps<RowProps>) {
  const log = logs[index];
  const lastLog = index > 0 ? logs[index - 1] : null;
  const stripeClass = index % 2 ? 'log__even' : 'log__odd';
  const continuedSource = lastLog !== null && log.source === lastLog.source;
  const sourceSpan = continuedSource ? (
    <span>{'-'.padStart(longestSource + 1)}</span>
  ) : (
    <span className={`log__source log__source--${getClassModifier(log.source)}`}>{log.source.padStart(longestSource)}:</span>
  );
  const is404 = log.content.startsWith('404');
  const class404 = is404 ?
    (index % 2 ? 'log__404 log__404__even' : 'log__404 log__404__odd')
    : '';

  return (
    <pre
      key={index}
      style={style}
      className={`${stripeClass} ${class404}`}>
      <span className={`log__level-${LogLevel[log.logLevel]}`}>{getLevelText(log.logLevel)}</span>
      <span className='log__time-stamp'>[{formatTime(new Date(log.timestamp))}]</span>
      {sourceSpan}
      <span>{padLines(log.content, logLevelLength + timestampLength + longestSource)}</span>
    </pre>
  );
}

export function LogBox(props: LogBoxProps) {
  const scale = useAppSelector(state => state.preferences.scaleValues.logs);
  const fontSize = Math.floor(calcScale(8, 24, scale));

  const rowHeight = (index: number, { logs }: RowProps) => {
    return (fontSize + 2) * logs[index].lineCount;
  };

  return (
    <List<RowProps>
      className='log simple-scroll'
      style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize + 2}px` }}
      rowComponent={LogRow}
      rowProps={{
        logs: props.logs,
        longestSource: props.longestSource
      }}
      rowCount={props.logs.length}
      rowHeight={rowHeight}
      overscanCount={25} />
  );
}

/**
 * Create a CSS class "modifier" name from the name of a log entry source
 * (it just makes it lower-case, only alphabetical characters and replaces all spaces with "-")
 *
 * @param source Log source
 */
function getClassModifier(source: string): string {
  return (
    source
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-z-]/gi, '') // (Only allow a-z and "-")
  );
}

function getLevelText(logLevel: LogLevel) {
  return LogLevel[logLevel].padEnd(5);
}
