import { createMockGame } from '@test/mocks/game';
import { renderWithProviders } from '@test/redux';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';

describe('GameItemContainer', () => {
  it('select then deselect', async () => {
    const user = userEvent.setup();
    let selection: string | undefined = undefined;
    const onSelect = vi.fn((_event, id: string) => selection = id);
    const onDeselect = vi.fn(() => selection = undefined);
    const onLaunch = vi.fn();


    const mockGames = [
      createMockGame(),
      createMockGame(),
      createMockGame(),
      createMockGame(),
      createMockGame(),
    ];

    const mockGameElems = mockGames.map(game =>
      <GameGridItem
        game={game}
        key={game.id}
        upperIcons={[]}
        lowerIcons={[]}
        extreme={false}
        screenshotPreviewMode={0}
        screenshotPreviewDelay={100}
        hideExtremeScreenshots={false}
        logoVersion={0}
        isSelected={selection === game.id}
        isDragged={false}/>
    );

    const { container, rerender } = renderWithProviders(
      <GameItemContainer
        type='list'
        onContentSelect={onSelect}
        onContentDeselect={onDeselect}
        onContentLaunch={onLaunch}
        selectedGameId={selection}>
        {mockGameElems}
      </GameItemContainer>
    );

    // Select first game
    const firstGameElement = container.querySelector(`[${GameGridItem.idAttribute}="${mockGames[0].id}"]`);
    expect(firstGameElement).toBeInTheDocument();
    await user.click(firstGameElement!);
    expect(selection).toEqual(mockGames[0].id);
    expect(onLaunch).toBeCalledTimes(0);


    // Run third game
    const thirdGameElement = container.querySelector(`[${GameGridItem.idAttribute}="${mockGames[2].id}"]`);
    expect(thirdGameElement).toBeInTheDocument();
    await user.dblClick(thirdGameElement!);
    expect(selection).toEqual(mockGames[2].id);
    expect(onLaunch).toBeCalledTimes(1);

    // Don't deselect third game for first 500ms
    await user.click(thirdGameElement!);
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(selection).toEqual(mockGames[2].id);
    expect(onLaunch).toBeCalledTimes(1);

    // Update selectedGameId
    rerender(
      <GameItemContainer
        type='list'
        onContentSelect={onSelect}
        onContentDeselect={onDeselect}
        onContentLaunch={onLaunch}
        selectedGameId={selection}>
        {mockGameElems}
      </GameItemContainer>
    );

    await new Promise(resolve => setTimeout(resolve, 600));

    await user.click(thirdGameElement!);
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(selection).toBe(undefined);
    expect(onLaunch).toBeCalledTimes(1);
  });
});

