import { ConfirmDialogProps } from 'flashpoint-launcher-renderer';
import { SimpleButton } from './SimpleButton';

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <div className='confirm-dialog'>
      <div className='confirm-dialog__message'>{props.message}</div>
      <div className='confirm-dialog__buttons'>
        { props.buttons.map((text, index) => {
          return (
            <SimpleButton
              key={index}
              value={text}
              onClick={() => props.onResult(index)} />
          );
        }) }
      </div>
    </div>
  );
}
