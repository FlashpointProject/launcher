import { SizeProviderProps } from 'flashpoint-launcher-renderer';
import { useEffect, useRef } from 'react';

// Sets and updates the "--width" and "--height" CSS variables to match the prop values.
export function SizeProvider(props: SizeProviderProps) {
  const ref = useRef(null);
  // Update "--width"
  useEffect(() => {
    if (props.width) {
      updateStyle(ref.current, '--width', typeof props.width === 'number' ? `${props.width}px` : props.width);
    }
  }, [props.width]);
  // Update "--height"
  useEffect(() => {
    if (props.height) {
      updateStyle(ref.current, '--height', typeof props.height === 'number' ? `${props.height}px` : props.height);
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
