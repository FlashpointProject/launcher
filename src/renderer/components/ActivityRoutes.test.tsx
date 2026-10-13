import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StateWrapper } from './ActivityRoutes';

describe('StateWrapper', () => {
  it('render after first shown and keep mounted after hidden', () => {
    const { rerender } = render(
      <StateWrapper show={false}>
        <div data-testid='child'/>
      </StateWrapper>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();

    rerender(
      <StateWrapper show={true}>
        <div data-testid='child'/>
      </StateWrapper>
    );

    expect(screen.queryByTestId('child')).toBeInTheDocument();

    rerender(
      <StateWrapper show={false}>
        <div data-testid='child'/>
      </StateWrapper>
    );

    expect(screen.queryByTestId('child')).toBeInTheDocument();
  });
});
