import * as React from 'react';

export type ConfigFlashpointPathInputProps = {
  /** Initial value of the input field. */
  input?: string;
  /** If the current input is valid. */
  isValid?: boolean;
  /** Text to display on the button */
  buttonText?: string;
  /** Called when the value of the input field is changed. */
  onInputChange?: (input: string) => void;
};

export function ConfigFlashpointPathInput(props: ConfigFlashpointPathInputProps) {
  const { input, isValid, buttonText, onInputChange } = props;
  let className = 'flashpoint-path__input';
  if (isValid !== undefined) {
    className += isValid ? ' flashpoint-path__input--valid' : ' flashpoint-path__input--invalid';
  }

  if (onInputChange && input === undefined) {
    onInputChange('');
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onInputChange) {
      onInputChange(event.target.value);
    }
  };

  const onBrowseClick = async () => {
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = await window.electronAPI?.showOpenDialog({
      title: 'Select the FlashPoint root directory',
      properties: ['openDirectory'],
    });
    if (onInputChange !== undefined && filePaths !== undefined) {
      onInputChange(filePaths[0]);
    }
  };

  return (
    <>
      <div className={className}>
        <input
          type='text'
          onChange={onChange}
          value={input} />
      </div>
      <input
        type='button'
        value={buttonText}
        className='simple-button'
        onClick={onBrowseClick} />
    </>
  );
}
