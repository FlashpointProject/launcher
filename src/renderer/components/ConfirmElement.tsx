import * as React from 'react';
import { useConfirm } from '../hooks/useConfirm';

export type ConfirmElementArgs = {
  /** Number of times this has been activated since the last reset. */
  activationCounter: number;
  /** Increments "activationCounter" (and then calls "onConfirm" if the counter exceeds "activationLimit"). */
  activate: () => void;
  /** Calls the "onConfirm" callback (does not change or reset "activationCounter") */
  confirm: () => void;
  /** Resets "activationCounter". */
  reset: () => void;
};

export type ConfirmElementProps = {
  /** Function that renders the element (render prop). */
  children?: (args: ConfirmElementArgs) => JSX.Element | void;
  /** Number of activations needed to confirm. */
  activationLimit?: number;
  /** Called when confirmed. */
  onConfirm?: () => void;
};

/** Wrapper component around the "useConfirm" hook. */
export function ConfirmElement(props: ConfirmElementProps) {
  // Hooks
  const [count, activate, confirm, reset] = useConfirm(props.activationLimit, props.onConfirm);
  // Render
  return props.children && props.children({
    activationCounter: count,
    activate: activate,
    reset: reset,
    confirm: confirm,
  }) || (<></>);
}
