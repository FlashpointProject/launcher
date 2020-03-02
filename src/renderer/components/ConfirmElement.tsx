import * as React from 'react';
import { useConfirm } from '../hooks/useConfirm';

export type ConfirmElementArgs<T = undefined> = {
  /** Number of times this has been activated since the last reset. */
  activationCounter: number;
  /** Increments "activationCounter" (and then calls "onConfirm" if the counter exceeds "activationLimit"). */
  activate: () => void;
  /** Calls the "onConfirm" callback (does not change or reset "activationCounter") */
  confirm: () => void;
  /** Extra props passed by the parent. */
  extra: T;
  /** Resets "activationCounter". */
  reset: () => void;
};

export type ConfirmElementProps<T = undefined> = {
  /** Function that renders the element (render prop). */
  children?: (args: ConfirmElementArgs<T>) => JSX.Element | void;
  /** Number of activations needed to confirm. */
  activationLimit?: number;
  /** Called when confirmed. */
  onConfirm?: () => void;
} & (T extends undefined ? {
  /** Extra props to pass through to the child. */
  extra?: undefined;
} : {
  /** Extra props to pass through to the child. */
  extra: T;
});

/** Wrapper component around the "useConfirm" hook. */
export function ConfirmElement<T = undefined>(props: ConfirmElementProps<T>) {
  // Hooks
  const [count, activate, confirm, reset] = useConfirm(props.activationLimit, props.onConfirm);
  // Render
  return props.children && props.children({
    activate: activate,
    activationCounter: count,
    confirm: confirm,
    extra: props.extra as any,
    reset: reset,
  }) || (<></>);
}
