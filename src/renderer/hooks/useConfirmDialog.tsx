import { ConfirmDialog, ConfirmDialogProps } from '@renderer/components/ConfirmDialog';
import { FloatingContainer } from '@renderer/components/FloatingContainer';
import { ReactNode, useState, Activity } from 'react';

type ConfirmDialogState = {
  confirmDialog: ReactNode;
  openConfirmDialog: (props: Omit<ConfirmDialogProps, 'onResult'>) => Promise<number>
}

export function useConfirmDialog(): ConfirmDialogState {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState<ConfirmDialogProps>();

  const openConfirmDialog = (newDialogProps: Omit<ConfirmDialogProps, 'onResult'>) => {
    return new Promise<number>((resolve) => {
      setIsOpen(true);
      setDialogProps({
        ...newDialogProps,
        onResult: resolve
      });
    });
  };

  const confirmDialog = (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      {dialogProps !== undefined && (
        <FloatingContainer>
          <ConfirmDialog {...dialogProps} />
        </FloatingContainer>
      )}
    </Activity>
  );

  return {
    confirmDialog,
    openConfirmDialog
  };
}
