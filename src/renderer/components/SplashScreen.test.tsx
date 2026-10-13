import { setMainState } from '@renderer/store/main/slice';
import { renderWithProviders } from '@test/redux';
import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SplashScreen } from './SplashScreen';

describe('SplashScreen', () => {
  it('should unmount 2000ms after loaded all', async () => {
    const { container, store } = renderWithProviders(<SplashScreen/>);

    expect(container.querySelector('.splash-screen')).toBeInTheDocument();

    act(() => store.dispatch(setMainState({
      loadedAll: true,
    })));

    // Wait for it to disappear (with timeout slightly longer than 2000ms)
    await waitFor(
      () => {
        expect(container.querySelector('.splash-screen')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
