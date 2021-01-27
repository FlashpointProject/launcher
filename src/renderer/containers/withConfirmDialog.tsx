import * as React from 'react';
import { ConfirmDialog, ConfirmDialogProps } from '@renderer/components/ConfirmDialog';
import { FloatingContainer } from '@renderer/components/FloatingContainer';

type ConfirmDialogExtraProps = ConfirmDialogProps & {
  disableCancel?: boolean;
}

type WithConfirmDialogState = {
  open: boolean;
  confirmProps: ConfirmDialogExtraProps
}

export type WithConfirmDialogProps = {
  openConfirmDialog: (message: string, buttons: string[], cancelId?: number, disableCancel?: boolean) => Promise<number>;
};

export function withConfirmDialog<P>(Component: React.ComponentType<P>) {
  // eslint-disable-next-line react/display-name
  return class extends React.Component<{}, WithConfirmDialogState> {
    state: WithConfirmDialogState = {
      open: false,
      confirmProps: {
        message: '',
        buttons: [],
        onResult: () => {}
      }
    };

    openConfirmDialog = (message: string, buttons: string[], cancelId?: number, disableCancel?: boolean): Promise<number> => {
      return new Promise<number>((resolve, reject) => {
        if (buttons.length === 0) {
          reject('At least one button must be provided!');
        }
        this.setState({
          open: true,
          confirmProps: {
            message,
            buttons,
            cancelId,
            disableCancel,
            onResult: (number) => {
              this.setState({ open: false });
              resolve(number);
            }
          }
        });
      });
    }

    cancelDialog = () => {
      if (this.state.open && !this.state.confirmProps.disableCancel) {
        const cancelId = this.state.confirmProps.cancelId || 0;
        this.state.confirmProps.onResult(cancelId);
      }
    }

    render() {
      return (
        <div className='page-wrap'>
          <Component
            {...this.props as P} // @HACK This is annoying to make typsafe
            openConfirmDialog={this.openConfirmDialog} />
          { this.state.open && (
            <FloatingContainer
              onClick={this.cancelDialog}>
              <ConfirmDialog {...this.state.confirmProps} />
            </FloatingContainer>
          )}
        </div>
      );
    }
  };
}
