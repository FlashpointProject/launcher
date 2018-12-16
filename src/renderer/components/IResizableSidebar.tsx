import * as React from 'react';
import { IDefaultProps } from '../interfaces';

interface IResizableSidebarProps extends IDefaultProps {
  className?: string;
  none: boolean;
  /** If the sidebar should not be visible */
  hide: boolean;
  /** Where the divider should be located */
  divider: DividerOrientation;
  /** Width of the whole sidebar */
  width?: number | string;
  /** Called when starting to resize the sidebar (when the divider is grabbed) */
  onResizeStart?: () => void;
  /** Called when the sidebar is resized (when the cursor is moving while the divider is grabbed) */
  onResize?: (event: IResizeEvent) => void;
  /** Called when ending the resize the sidebar (when the divider is released) */
  onResizeEnd?: () => void;
}

export interface IResizableSidebarState {
  /** If the divider is grabbed */
  isDragging: boolean;
  /** Cursors x position when it grabbed the divider */
  startX: number;
  /** Width of the whole sidebar when the divider is grabbed */
  startWidth: number;
}

export interface IResizeEvent {
  event: MouseEvent;
  startX: number;
  startWidth: number;
}

export class IResizableSidebar extends React.Component<IResizableSidebarProps, IResizableSidebarState> {
  private sidebarRef: React.RefObject<HTMLDivElement> = React.createRef();
  
  constructor(props: IResizableSidebarProps) {
    super(props);
    this.state = {
      isDragging: false,
      startX: 0,
      startWidth: 0,
    };
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onDividerMouseDown = this.onDividerMouseDown.bind(this);
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
    const { none, hide, className, divider, width } = this.props;
    return (
      <div className={'game-browser__sidebar'+
                      (className?' '+className+' ':'')+
                      (none?'':' game-browser__sidebar--none')+
                      (hide?'':' game-browser__sidebar--hidden')}
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

  onDividerMouseDown(event: React.MouseEvent) {
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

  onMouseUp(event: MouseEvent) {
    if (event.button === 0 && this.state.isDragging) {
      this.setState({ isDragging: false });
      if (this.props.onResizeEnd) { this.props.onResizeEnd(); }
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.state.isDragging) {
      const { startX, startWidth } = this.state;
      if (this.props.onResize) { this.props.onResize({ event, startX, startWidth }); }
    }
  }
}

type DividerOrientation = 'before' | 'after';
