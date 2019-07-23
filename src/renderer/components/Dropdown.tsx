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
  const onClick = useCallback((event: React.MouseEvent) => {
    setExpanded(!expanded);
    event.preventDefault();
  }, [expanded]);
  // Render
  return (
    <div className='checkbox-dropdown'>
      <div
        className='checkbox-dropdown__select-box'
        onClick={onClick}
        tabIndex={0}>
        { props.text }
      </div>
      <div
        className={'checkbox-dropdown__content' + (expanded ? '' : ' checkbox-dropdown__content--hidden')}
        ref={contentRef}>
        { props.children }
      </div>
    </div>
  );
}
