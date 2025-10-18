import { useEffect, useRef, useState } from 'react';
import { FancyAnimation } from './FancyAnimation';

type ResizableSidebarProps = {
  className?: string;
  /** If the sidebar should be visible. */
  show: boolean;
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
  children?: React.ReactNode;
};

export type SidebarResizeEvent = {
  /** Underlying mouse event. */
  event: MouseEvent;
  /** The cursor's x position when it grabbed the divider (in pixels). */
  startX: number;
  /** Width of the whole sidebar when the divider was grabbed. */
  startWidth: number;
};

export function ResizableSidebar(props: ResizableSidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const sidebarRef = useRef(null);
  const { onResizeStart, onResizeEnd, onResize, className, width, divider, show } = props;

  const onDividerMouseDown = (event: React.MouseEvent): void => {
    if (event.button === 0 && !isDragging) {
      if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
      if (!sidebarRef.current) { throw new Error('sidebar div is missing.'); }
      setIsDragging(true);
      setStartX(event.clientX);
      setStartWidth(parseInt(document.defaultView.getComputedStyle(sidebarRef.current).width || '', 10));
      if (onResizeStart) { onResizeStart(); }
      event.preventDefault();
    }
  };

  const renderDivider = () => {
    return (
      <FancyAnimation
        normalRender={(
          <div
            className='game-browser__sidebar__divider'
            onMouseDown={onDividerMouseDown} />
        )}
        fancyRender={(
          <div
            className='game-browser__sidebar__divider game-browser__sidebar__divider--animated'
            onMouseDown={onDividerMouseDown} />
        )}/>
    );
  };

  useEffect(() => {
    const onMouseUp = (event: MouseEvent): void => {
      if (event.button === 0 && isDragging) {
        setIsDragging(false);
        if (onResizeEnd) { onResizeEnd(); }
        event.preventDefault();
      }
    };

    const onMouseMove = (event: MouseEvent): void => {
      if (isDragging) {
        if (onResize) { onResize({ event, startX, startWidth }); }
      }
    };

    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isDragging, props, startWidth, startX, onResize, onResizeEnd]);

  return (
    <div
      className={
        'game-browser__sidebar' +
        (className ? ' '+className+' ' : '') +
        (show ? '' : ' game-browser__sidebar--hidden')
      }
      ref={sidebarRef}
      style={{ width }}>
      <div className='game-browser__sidebar__inner'>
        { divider === 'before' && show && renderDivider() }
        <div className='game-browser__sidebar__content simple-scroll'>
          {props.children}
        </div>
        { divider === 'after' && show && renderDivider() }
      </div>
    </div>
  );
}

type DividerOrientation = 'before' | 'after';
