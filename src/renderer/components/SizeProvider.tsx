import * as React from 'react';
import { useEffect, useRef } from 'react';

export type SizeProviderProps = {
  /** Children of the wrapping <div> element. */
  children?: React.ReactNode;
  /** Value to set the "--width" CSS variable to. */
  width?: string | number;
  /** Value to set the "--height" CSS variable to. */
  height?: string | number;
};

// Sets and updates the "--width" and "--height" CSS variables to match the prop values.
export function SizeProvider(props: SizeProviderProps) {
  const ref = useRef(null);
  // Update "--width"
  useEffect(() => {
    if (props.width) {
      updateStyle(ref.current, '--width', props.width);
    }
  }, [props.width]);
  // Update "--height"
  useEffect(() => {
    if (props.height) {
      updateStyle(ref.current, '--height', props.height);
    }
  }, [props.height]);
  // Render
  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {props.children}
    </div>
  );
}

/**
 * Update the a style property of the style attribute of an element.
 *
 * @param element Element to update the style attribute of.
 * @param prop Name of the style property.
 * @param value Value of the style property.
 */
function updateStyle(element: HTMLElement | null, prop: string, value: string | number): void {
  if (!element) { throw new Error('Can not update CSS variables. Element not found.'); }
  element.style.setProperty(prop, value+'');
}
