import { useCallback, useReducer } from 'react';

type ActivateCallback = () => void;
type ConfirmCallback = () => void;
type ResetCallback = () => void;

type ConfirmState = {
  /** Number of times it has been activated since the last reset. */
  count: number;
};

type ConfirmAction = ({
  type: 'reset',
} | {
  type: 'increment',
  limit: number,
  confirm: () => void,
});

const confirmDefaultState: ConfirmState = Object.freeze({
  count: 0,
});

function confirmReducer(state: ConfirmState, action: ConfirmAction): ConfirmState {
  switch (action.type) {
    case 'increment':
      let nextCount = state.count + 1;
      if (nextCount > action.limit) {
        action.confirm();
        nextCount = 0;
      }
      return { count: nextCount };
    case 'reset':
      return { count: 0 };
    default:
      throw new Error(`Invalid action "${action}".`);
  }
}

type ConfirmReturn = [
  /** Number of times this has been activated since the last reset. */
  number, // (count)
  /** Increments "count" (and then calls "onConfirm" if the counter exceeds "limit"). */
  ActivateCallback,
  /** Calls the "onConfirm" callback (does not change or reset "count") */
  ConfirmCallback,
  /** Resets "count". */
  ResetCallback
];

/**
 *
 * @param confirmLimit Number of activations needed to confirm.
 * @param onConfirm Called when confirmed.
 */
export function useConfirm(confirmLimit?: number, onConfirm?: () => void): ConfirmReturn {
  const [state, dispatch] = useReducer(confirmReducer, confirmDefaultState);
  // Default limit
  const limit = (confirmLimit === undefined) ? 1 : confirmLimit;
  // Confirm callback
  const confirm = useCallback(() => {
    if (onConfirm) { onConfirm(); }
  }, [onConfirm]);
  // Reset callback
  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, [dispatch]);
  // Activate callback
  const activate = useCallback(() => {
    dispatch({ type: 'increment', limit, confirm });
  }, [dispatch, limit, confirm, reset]);
  // Return
  return [state.count, activate, confirm, reset];
}
