import * as React from 'react';

/*
 * How clicking works:
 *
 * Note: It is assumed that no other mouse up/down events are emitted inbetween the steps of each list below.
 *
 * Single click:
 *   - Press down on an item
 *   - Release on the same item
 *
 * Double click:
 *   - Press down on an item (and add a timestamp)
 *   - Release on the same item
 *   - Press down on the same item (if the delay between the previous mouse down and this is below a threshold)
 *
 * Triple clicks and beyond:
 *   Same as double clicks but chained together.
 *   The "on_click" callback is called when the button is pressed down, compared to when it is released for single clicks.
 *
 *
 * How click "down" and "up" works:
 *
 * Click down:
 *   - Press down on an item
 *
 * Click up:
 *   - Press down on an item
 *   - Release on the same item
 *
 *
 * How the hook works internally:
 *
 * On mouse down:
 *   If the cursor is over an item:
 *     If the same item was clicked recetly AND with the same button:
 *       Increment the click counter
 *       Do a (chained) click
 *     Otherwise:
 *       Reset the click counter
 *     Update the item index
 *     Update the button index
 *     Update the click timestamp
 *   Otherwise:
 *     Reset
 *
 * On Mouse Up:
 *   If the cursor is over the same item it was pressed down over AND with the same button:
 *     If no clicks are chained:
 *       Do a (single) click
 *     Update the button index
 *   Otherwise:
 *     Reset
 *
 */

type UseMouseOpts<T> = {
  /** Maximum delay betweem clicks to consider them "chained" (in milliseconds). */
  chain_delay: number;
  /**
   * Returns the ID of the item the event is related to, or undefined if no item is found.
   *
   * @param event Mouse event related to the click (mouse up/down).
   */
  find_id(event: React.MouseEvent<HTMLElement, MouseEvent>): T | undefined;
  /**
   * Compares if two IDs are "equal".
   *
   * @param a First ID.
   * @param b Second ID.
   * @returns True if the are "equal". False otherwise.
   */
  compare_id?(a: T, b: T): boolean;
  /**
   * Called when a "click" has occurred.
   *
   * @param event Event of the click.
   * @param id Current ID.
   * @param clicks Number of clicks (1 is a "click", 2 is a "double click" etc.).
   */
  on_click(event: React.MouseEvent<HTMLElement, MouseEvent>, id: T, clicks: number): void;
  on_click_down?(event: React.MouseEvent<HTMLElement, MouseEvent>, id: T, clicks: number): void;
  on_click_up?(event: React.MouseEvent<HTMLElement, MouseEvent>, id: T, clicks: number): void;
}

type MouseRef<T> = {
  /** Options. */
  opts: UseMouseOpts<T>;
  /** Index of the most recently clicked item (undefined if the most recent click was not on an item). */
  id: T | undefined;
  /** Button that was used for the most recent click (-1 if the most recent click was not on an item). */
  button: number;
  /** Timestamp of when the most recent click was made on the current item. */
  click_timestamp: number;
  /** Number of clicks on the same item in quick succession. */
  clicks: number;
}

/**
 * Flexible hook for detecting clicks (single, double, triple etc.) of any mouse button.
 *
 * @param initializer Returns the options object to use for this hook. Only called the first time.
 * @param deps Array of dependencies that if changed, will call the initializer again.
 */
export function useMouse<T>(initializer: () => UseMouseOpts<T>, deps: React.DependencyList) {
  const [options] = React.useState(initializer);
  const ref = React.useRef<MouseRef<T>>({
    opts: options,
    id: undefined,
    button: -1,
    click_timestamp: 0,
    clicks: 0,
  });

  const on_mouse_down = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    const id = ref.current.opts.find_id(event);

    if (id !== undefined) {
      const now = Date.now();

      if (compare(id, ref.current.id, ref.current.opts.compare_id) &&
        (ref.current.button === event.button) &&
        (now - ref.current.click_timestamp < ref.current.opts.chain_delay)) {
        ref.current.clicks += 1;
        ref.current.opts.on_click(event, id, ref.current.clicks);
      } else {
        ref.current.clicks = 0;
      }

      if (ref.current.opts.on_click_down) {
        ref.current.opts.on_click_down(event, id, ref.current.clicks);
      }

      ref.current.id = id;
      ref.current.button = event.button;
      ref.current.click_timestamp = now;
    } else {
      reset(ref.current);
    }
  };

  const on_mouse_up = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    const id = ref.current.opts.find_id(event);

    if ((id !== undefined) && (ref.current.button === event.button) && compare(id, ref.current.id, ref.current.opts.compare_id)) {
      if (ref.current.clicks === 0) {
        ref.current.clicks = 1;
        ref.current.opts.on_click(event, id, ref.current.clicks);
      }

      if (ref.current.opts.on_click_up) {
        ref.current.opts.on_click_up(event, id, ref.current.clicks);
      }

      ref.current.button = event.button;
    } else {
      reset(ref.current);
    }
  };

  return [on_mouse_down, on_mouse_up];
}

/**
 * Compare if two IDs are considered equal. If at least one ID is undefined they will not be considered equal.
 *
 * @param a First ID.
 * @param b Second ID.
 * @param compare_id Function for comparing IDs. If undefined a strict equals will be performed instead.
 */
function compare<T>(a: T | undefined, b: T | undefined, compare_id: ((a: T, b: T) => boolean) | undefined): boolean {
  if ((a !== undefined) && (b !== undefined)) {
    return compare_id ? compare_id(a, b) : (a === b);
  }
  return false;
}

function reset(ref: MouseRef<any>): void {
  ref.id = undefined;
  ref.button = -1;
  ref.click_timestamp = 0;
  ref.clicks = 1;
}
