import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIfAncestor } from '../Util';

export type DropdownProps = {
  /** Element(s) to show in the drop-down element (only visible when expanded). */
  children: React.ReactNode;
  /** Text to show in the text field (always visible). */
  text: string;
};

/** A text element, with a drop-down element that can be shown/hidden. */
export function Dropdown(props: DropdownProps) {
  // Hooks
  const [expanded, setExpanded] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { // ("Hide" the drop-downs content if the user clicks outside the content element)
    if (expanded) {
      const onGlobalMouseDown = (event: MouseEvent) => {
        if (!event.defaultPrevented) {
          if (!checkIfAncestor(event.target as HTMLElement | null, contentRef.current)) {
            setExpanded(false);
          }
        }
      };
      document.addEventListener('mousedown', onGlobalMouseDown);
      return () => { document.removeEventListener('mousedown', onGlobalMouseDown); };
    }
  }, [expanded, contentRef]);
  const onMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 0) { // (Left mouse button)
      setExpanded(!expanded);
      event.preventDefault();
    }
  }, [expanded]);
  // Render
  return (
    <div className='simple-dropdown'>
      <div
        className='simple-dropdown__select-box'
        onMouseDown={onMouseDown}
        tabIndex={0}>
        { props.text }
      </div>
      <div
        className={'simple-dropdown__content' + (expanded ? '' : ' simple-dropdown__content--hidden')}
        ref={contentRef}>
        { props.children }
      </div>
    </div>
  );
}
