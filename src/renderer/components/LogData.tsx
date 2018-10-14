import * as React from 'react';

interface ILogDataProps {
  logData: string;
}

interface ILogDataSnapshot {
  scrolledToBottom: boolean;
}

/**
 * Renders the log data.
 *
 * The log output will auto scroll when new log data is added. The auto
 * scrolling is automatically disabled when the user scrolls up, and
 * automatically re-enabled when the user scrolls all the way down.
 */
export default class LogData extends React.Component<ILogDataProps> {
  private preNodeRef = React.createRef<HTMLPreElement>();

  /**
   * Detect if we are scrolled all the way to the bottom before the logs are
   * updated. The return value is passed on the componentDidUpdate.
   */
  getSnapshotBeforeUpdate(): ILogDataSnapshot | null {
    const preNode = this.preNodeRef.current;
    if (!preNode) throw Error('<pre> is not mounted');

    const scrolledToBottom = (
      preNode.scrollHeight - preNode.scrollTop === preNode.clientHeight
    );

    return { scrolledToBottom };
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
   *
   * @param snapshot The return value of `getSnapshotBeforeUpdate`
   */
  componentDidUpdate(prevProps: ILogDataProps, prevState: {}, snapshot: ILogDataSnapshot) {
    if (snapshot == null) return;
    if (!snapshot.scrolledToBottom) return;

    this.scrollAllTheDown();
  }

  private scrollAllTheDown() {
    const preNode = this.preNodeRef.current;
    if (!preNode) throw Error('<pre> is not mounted');

    preNode.scrollTop = preNode.scrollHeight;
  }

  render() {
    const { logData } = this.props;

    return (
      <pre className='logs__log-data simple-scroll' ref={this.preNodeRef}>
        {logData}
      </pre>
    )
  }
}
