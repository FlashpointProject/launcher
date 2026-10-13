import { withConfirmDialog, WithConfirmDialogProps } from '@renderer/containers/withConfirmDialog';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { Subtract } from '@shared/interfaces';
import * as React from 'react';

export type ConfirmElementArgs<T = undefined> = {
  /** Calls the "onConfirm" callback (does not change or reset "activationCounter") */
  confirm: () => void;
  /** Extra props passed by the parent. */
  extra: T;
};

type ConfirmElementComponentProps<T = undefined> = {
  /** Function that renders the element (render prop). */
  render?: (args: ConfirmElementArgs<T>) => React.JSX.Element | undefined;
  /** Confirmation Message */
  message: string;
  /** Called when confirmed. */
  onConfirm?: () => void;
} & (T extends undefined ? {
  /** Extra props to pass through to the child. */
  extra?: undefined;
} : {
  /** Extra props to pass through to the child. */
  extra: T;
}) & WithConfirmDialogProps;

// Wrapper component around the "useConfirm" hook.
function ConfirmElementComponent<T = undefined>(props: ConfirmElementComponentProps<T>) {
  const { onConfirm, message, render, extra } = props;
  const strings = useLocalization();
  const confirm = async () => {
    if (onConfirm) {
      const res = await props.openConfirmDialog(message, [strings.misc.yes, strings.misc.no], 1, 0);
      if (res === 0) {
        onConfirm();
      }
    }
  };
  // Render
  return render && render({
    confirm: confirm,
    extra: extra as any
  }) || (<></>);
}

export type ConfirmElementProps<T = undefined> = Subtract<ConfirmElementComponentProps<T>, WithConfirmDialogProps>;
export const ConfirmElement = withConfirmDialog(ConfirmElementComponent) as unknown as <T = undefined>(props: ConfirmElementProps<T>) => React.JSX.Element;
