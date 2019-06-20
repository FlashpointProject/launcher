import * as React from 'react';
import { useEffect, useRef } from 'react';

export type SizeProviderProps = {
  /** Children of the wrapping <div> element. */
  children?: React.ReactNode;
  /** Value to set the "--width" CSS variable to. */
  width: string | number;
  /** Value to set the "--height" CSS variable to. */
  height: string | number;
};

/** Sets and updates the "--width" and "--height" CSS variables to match the prop values. */
export function SizeProvider(props: SizeProviderProps) {
  const ref = useRef(null);
  // Update "--width"
  useEffect(() => {
    updateStyle(ref.current, '--width', props.width);
  }, [ref.current, props.width]);
  // Update "--height"
  useEffect(() => {
    updateStyle(ref.current, '--height', props.height);
  }, [ref.current, props.height]);
  // Render
  return (
    <div ref={ref}>
      {props.children}
    </div>
  );
}

/**
 * Update the a style property of the style attribute of an element.
 * @param element Element to update the style attribute of.
 * @param prop Name of the style property.
 * @param value Value of the style property.
 */
function updateStyle(element: HTMLElement | null, prop: string, value: string | number): void {
  if (!element) { throw new Error('Can not update CSS variables. Element not found.'); }
  element.style.setProperty(prop, value+'');
}
