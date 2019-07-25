import * as React from 'react';

export type LogDataProps = {
  className?: string;
  /** Text to show in the log. */
  logData: string;
  /** If the "logData" should be displayed as HTML or plain text (defaults to plain text). */
  isLogDataHTML?: boolean;
};

type LogDataSnapshot = {
  scrolledToBottom: boolean;
};

/**
 * Renders the log data.
 *
 * The log output will auto scroll when new log data is added. The auto
 * scrolling is automatically disabled when the user scrolls up, and
 * automatically re-enabled when the user scrolls all the way down.
 */
export class LogData extends React.Component<LogDataProps> {
  preNodeRef = React.createRef<HTMLPreElement>();

  /**
   * Detect if we are scrolled all the way to the bottom before the logs are
   * updated. The return value is passed on the componentDidUpdate.
   */
  getSnapshotBeforeUpdate(): LogDataSnapshot | null {
    const preNode = this.preNodeRef.current;
    if (!preNode) { throw Error('<pre> is not mounted'); }
    return {
      scrolledToBottom: (preNode.scrollHeight - preNode.scrollTop) === preNode.clientHeight
    };
  }

  /**
   * Ensure that we are scrolled all the way down when the component mounts.
   * This ensures that the latest logs are immediately visible and that auto
   * scroll is immediately active.
   */
  componentDidMount() {
    this.scrollAllTheDown();
  }

  /**
   * Scroll all the way down if the pre was already scrolled all the way down
   * before the update.
   * @param snapshot The return value of `getSnapshotBeforeUpdate`
   */
  componentDidUpdate(prevProps: LogDataProps, prevState: {}, snapshot: LogDataSnapshot) {
    if (snapshot && snapshot.scrolledToBottom) {
      this.scrollAllTheDown();
    }
  }

  /** Scroll to the bottom of the log (jumping to the latest logged data). */
  scrollAllTheDown() {
    const preNode = this.preNodeRef.current;
    if (!preNode) { throw new Error('<pre> is not mounted'); }
    preNode.scrollTop = preNode.scrollHeight;
  }

  render() {
    const { className, logData, isLogDataHTML } = this.props;
    // Render the log content as html or as plain text
    const logContent = isLogDataHTML ?
      { dangerouslySetInnerHTML: { __html: this.props.logData } } :
      { children: logData };
    // Render
    return (
      <pre
        className={(className || '') + ' log simple-scroll'}
        ref={this.preNodeRef}
        { ...logContent } />
    );
  }
}
