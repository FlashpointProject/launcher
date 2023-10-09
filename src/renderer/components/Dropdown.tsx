import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIfAncestor } from '../Util';

export type DropdownProps = {
  /** Extra class name to add to dropdown frame */
  className?: string;
  headerClassName?: string;
  /** Element(s) to show in the drop-down element (only visible when expanded). */
  children: React.ReactNode;
  /** Text to show in the text field (always visible). */
  text: string;
  form?: boolean;
};

// A text element, with a drop-down element that can be shown/hidden.
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
    }
  }, [expanded]);

  const baseClass = props.form ? 'simple-dropdown-form' : 'simple-dropdown';

  // Render
  return (
    <div className={`${baseClass} ${props.className}`}>
      <div
        className={`${baseClass}__select-box ${props.headerClassName}`}
        onMouseDown={onMouseDown}
        tabIndex={0}>
        <div className={`${baseClass}__select-text`}>
          { props.text }
        </div>
        <div className={`${baseClass}__select-icon`} />
      </div>
      <div
        className={`${baseClass}__content` + (expanded ? '' : ` ${baseClass}__content--hidden`)}
        onMouseUp={() => setExpanded(false)}
        ref={contentRef}>
        { props.children }
      </div>
    </div>
  );
}
