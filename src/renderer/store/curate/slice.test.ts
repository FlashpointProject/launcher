import { initialCurateState, setCurrentCuration, sortCurations } from '@renderer/store/curate/slice';
import { mockCuration } from '@test/mocks/curate';
import { useTestServer } from '@test/useTestServer';
import { describe, expect, it } from 'vitest';
import { setupStore } from '../store';

describe('Curate Redux Store', () => {
  useTestServer();

  it('selection ranges with ctrl + shift modifiers', async () => {
    let curations = [
      mockCuration(),
      mockCuration(),
      mockCuration(),
      mockCuration(),
      mockCuration()
    ];

    const store = setupStore({
      curate: {
        ...initialCurateState(),
        curations
      }
    });

    curations = [...curations].sort(sortCurations);

    // Select third
    store.dispatch(setCurrentCuration({
      folder: curations[2].folder
    }));
    expect(store.getState().curate.current).toBe(curations[2].folder);
    expect(store.getState().curate.lastSelected).toBe(curations[2].folder);
    expect(store.getState().curate.selected).toHaveLength(1);
    expect(store.getState().curate.selected).toEqual(expect.arrayContaining([curations[2].folder]));

    // Select top 3 via shift select
    store.dispatch(setCurrentCuration({
      shift: true,
      folder: curations[0].folder
    }));
    expect(store.getState().curate.current).toBe(curations[2].folder);
    expect(store.getState().curate.lastSelected).toBe(curations[2].folder);
    expect(store.getState().curate.selected).toHaveLength(3);
    expect(store.getState().curate.selected).toEqual(expect.arrayContaining([
      curations[0].folder,
      curations[1].folder,
      curations[2].folder
    ]));

    // Select bottom 3 via shift select
    store.dispatch(setCurrentCuration({
      shift: true,
      folder: curations[4].folder
    }));
    expect(store.getState().curate.current).toBe(curations[2].folder);
    expect(store.getState().curate.lastSelected).toBe(curations[2].folder);
    expect(store.getState().curate.selected).toHaveLength(3);
    expect(store.getState().curate.selected).toEqual(expect.arrayContaining([
      curations[2].folder,
      curations[3].folder,
      curations[4].folder
    ]));

    // Select first + bottom 3 via ctrl select
    store.dispatch(setCurrentCuration({
      ctrl: true,
      folder: curations[0].folder
    }));
    expect(store.getState().curate.current).toBe(curations[2].folder);
    expect(store.getState().curate.lastSelected).toBe(curations[0].folder);
    expect(store.getState().curate.selected).toHaveLength(4);
    expect(store.getState().curate.selected).toEqual(expect.arrayContaining([
      curations[0].folder,
      curations[2].folder,
      curations[3].folder,
      curations[4].folder
    ]));
  });
});
