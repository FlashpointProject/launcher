import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SizeProvider } from './SizeProvider';

describe('SizeProvider', () => {
  it('set CSS properties for --width and --height', () => {
    const { container } = render(
      <SizeProvider width={300} height={400}>
        <div>Content</div>
      </SizeProvider>
    );

    const providerDiv = container.firstChild as HTMLElement;

    expect(providerDiv.style.getPropertyValue('--width')).toBe('300');
    expect(providerDiv.style.getPropertyValue('--height')).toBe('400');
  });

  it('update CSS variables when props change', () => {
    // First render
    const { container, rerender } = render(
      <SizeProvider width="100px" height="200px">
        <div>Content</div>
      </SizeProvider>
    );

    const providerDiv = container.firstChild as HTMLElement;

    expect(providerDiv.style.getPropertyValue('--width')).toBe('100px');
    expect(providerDiv.style.getPropertyValue('--height')).toBe('200px');

    // Re-render with different width and height
    rerender(
      <SizeProvider width="500px" height="600px">
        <div>Content</div>
      </SizeProvider>
    );

    expect(providerDiv.style.getPropertyValue('--width')).toBe('500px');
    expect(providerDiv.style.getPropertyValue('--height')).toBe('600px');
  });
});
