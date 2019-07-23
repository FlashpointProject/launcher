import * as React from 'react';

type ResizableSidebarProps = {
  className?: string;
  /** If the sidebar should not be visible. */
  hide: boolean;
  /** Where the divider should be located (relative to the sidebar). */
  divider: DividerOrientation;
  /** Width of the whole sidebar (in pixels). */
  width?: number | string;
  /** Called when starting to resize the sidebar (when the divider is grabbed). */
  onResizeStart?: () => void;
  /** Called when the sidebar is resized (when the cursor is moving while the divider is grabbed). */
  onResize?: (event: SidebarResizeEvent) => void;
  /** Called when ending the resize the sidebar (when the divider is released). */
  onResizeEnd?: () => void;
};

type ResizableSidebarState = {
  /** If the divider is grabbed. */
  isDragging: boolean;
  /** The cursor's x position when it grabbed the divider (in pixels). */
  startX: number;
  /** Width of the whole sidebar when the divider was grabbed. */
  startWidth: number;
};

export type SidebarResizeEvent = {
  /** Underlying mouse event. */
  event: MouseEvent;
  /** The cursor's x position when it grabbed the divider (in pixels). */
  startX: number;
  /** Width of the whole sidebar when the divider was grabbed. */
  startWidth: number;
};

export class ResizableSidebar extends React.Component<ResizableSidebarProps, ResizableSidebarState> {
  sidebarRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: ResizableSidebarProps) {
    super(props);
    this.state = {
      isDragging: false,
      startX: 0,
      startWidth: 0,
    };
  }

  componentDidMount() {
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  componentWillUnmount() {
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  render() {
    const { hide, className, divider, width } = this.props;
    return (
      <div
        className={
          'game-browser__sidebar' +
          (className ? ' '+className+' ' : '') +
          (hide ? '' : ' game-browser__sidebar--hidden')
        }
        style={{ width }}
        ref={this.sidebarRef}>
        <div className='game-browser__sidebar__inner'>
          { divider === 'before' && this.renderDivider() }
          <div className='game-browser__sidebar__content simple-scroll'>
            {this.props.children}
          </div>
          { divider === 'after' && this.renderDivider() }
        </div>
      </div>
    );
  }

  renderDivider() {
    return (
      <div className='game-browser__sidebar__divider'
           onMouseDown={this.onDividerMouseDown}>
      </div>
    );
  }

  onDividerMouseDown = (event: React.MouseEvent): void => {
    if (event.button === 0 && !this.state.isDragging) {
      if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
      if (!this.sidebarRef.current) { throw new Error('sidebar div is missing.'); }
      this.setState({
        isDragging: true,
        startX: event.clientX,
        startWidth: parseInt(document.defaultView.getComputedStyle(this.sidebarRef.current).width || '', 10),
      });
      if (this.props.onResizeStart) { this.props.onResizeStart(); }
      event.preventDefault();
    }
  }

  onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0 && this.state.isDragging) {
      this.setState({ isDragging: false });
      if (this.props.onResizeEnd) { this.props.onResizeEnd(); }
      event.preventDefault();
    }
  }

  onMouseMove = (event: MouseEvent): void => {
    if (this.state.isDragging) {
      const { startX, startWidth } = this.state;
      if (this.props.onResize) { this.props.onResize({ event, startX, startWidth }); }
    }
  }
}

type DividerOrientation = 'before' | 'after';
