import { ConfirmDialog, ConfirmDialogProps } from '@renderer/components/ConfirmDialog';
import { FloatingContainer } from '@renderer/components/FloatingContainer';
import { Subtract } from '@shared/interfaces';
import * as React from 'react';

type ConfirmDialogExtraProps = ConfirmDialogProps & {
  confirmId?: number;
}

type WithConfirmDialogState = {
  open: boolean;
  confirmProps: ConfirmDialogExtraProps
}

export type WithConfirmDialogProps = {
  openConfirmDialog: (message: string, buttons: string[], cancelId?: number, confirmId?: number) => Promise<number>;
};

export function withConfirmDialog<P>(Component: React.ComponentType<P>) {
  // eslint-disable-next-line react/display-name
  return class extends React.Component<Subtract<P, WithConfirmDialogProps>, WithConfirmDialogState> {
    state: WithConfirmDialogState = {
      open: false,
      confirmProps: {
        message: '',
        buttons: [],
        onResult: () => {}
      }
    };

    componentDidMount() {
      document.addEventListener('keydown' , this.onKeyDown);
    }

    componentWillUnmount() {
      document.removeEventListener('keydown' , this.onKeyDown);
    }

    onKeyDown = (event: any) => {
      if (this.state.open) {
        switch (event.key) {
          case 'Enter':
            if (this.state.confirmProps.confirmId !== undefined) {
              this.state.confirmProps.onResult(this.state.confirmProps.confirmId);
              this.setState({
                open: false
              });
            }
            event.preventDefault();
            break;
          case 'Escape':
          case 'Backspace':
            if (this.state.confirmProps.cancelId !== undefined) {
              this.state.confirmProps.onResult(this.state.confirmProps.cancelId);
              this.setState({
                open: false
              });
            }
            event.preventDefault();
            break;
        }
      }
    };

    openConfirmDialog = (message: string, buttons: string[], cancelId?: number, confirmId?: number): Promise<number> => {
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
            confirmId,
            onResult: (number) => {
              this.setState({ open: false });
              resolve(number);
            }
          }
        });
      });
    };

    render() {
      return (
        <>
          <Component
            onKeyDown={this.onKeyDown}
            {...this.props as P} // @HACK This is annoying to make typsafe
            openConfirmDialog={this.openConfirmDialog} />
          { this.state.open && (
            <FloatingContainer>
              <ConfirmDialog {...this.state.confirmProps} />
            </FloatingContainer>
          )}
        </>
      );
    }
  };
}
