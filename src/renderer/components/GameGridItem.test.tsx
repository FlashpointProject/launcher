import { getGameImageURL } from '@renderer/Util';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Content } from 'flashpoint-launcher';
import { describe, expect, it } from 'vitest';
import { GameGridItem } from './GameGridItem';

describe('GameGridItem', () => {
  it('show screenshot with delay', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <GameGridItem
        game={testGame}
        upperIcons={[]}
        lowerIcons={[]}
        extreme={false}
        screenshotPreviewMode={ScreenshotPreviewMode.ON}
        screenshotPreviewDelay={50}
        hideExtremeScreenshots={true}
        logoVersion={1}
        isSelected={true}
        isDragged={false} />
    );

    const imageDiv = container.querySelector('.game-grid-item__thumb__image');
    expect(imageDiv).not.toBeUndefined();
    expect(imageDiv).toHaveStyle(`background-image: url(${getGameImageURL(testGame.logoPath)})`);

    // Change to screenshot after hovering for at least 50ms
    await user.hover(imageDiv as any);
    expect(imageDiv).toHaveStyle(`background-image: url(${getGameImageURL(testGame.logoPath)})`);
    await waitFor(() => {
      expect(imageDiv).toHaveStyle(`background-image: url(${getGameImageURL(testGame.screenshotPath)})`);
    }, { timeout: 100 });

    // Change back to logo with unhovering
    await user.unhover(imageDiv as any);
    expect(imageDiv).toHaveStyle(`background-image: url(${getGameImageURL(testGame.logoPath)})`);
  });

  it('hide extreme screenshot on hover', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <GameGridItem
        game={testGame}
        upperIcons={[]}
        lowerIcons={[]}
        extreme={true}
        screenshotPreviewMode={ScreenshotPreviewMode.ON}
        screenshotPreviewDelay={50}
        hideExtremeScreenshots={true}
        logoVersion={1}
        isSelected={true}
        isDragged={false} />
    );

    const imageDiv = container.querySelector('.game-grid-item__thumb__image');
    expect(imageDiv).not.toBeUndefined();
    expect(imageDiv).toHaveStyle(`background-image: url(${getGameImageURL(testGame.logoPath)})`);

    // Make sure the screenshot does not show after the 50ms hover time
    await user.hover(imageDiv as any);
    expect(imageDiv).toHaveStyle(`background-image: url(${getGameImageURL(testGame.logoPath)})`);
    await waitFor(() => {
      expect(imageDiv).toHaveStyle(`background-image: url(${getGameImageURL(testGame.logoPath)})`);
    }, { timeout: 100 });
  });
});

const testGame: Content = {
  id: '1234',
  title: 'test game',
  screenshotPath: 'screenshot.png',
  logoPath: 'logo.png',
};

