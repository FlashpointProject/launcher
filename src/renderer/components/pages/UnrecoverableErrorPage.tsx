import { UnrecoverableError } from 'flashpoint-launcher-renderer';
import { useState } from 'react';
import { SimpleButton } from '../SimpleButton';

type UnrecoverableErrorPageProps = {
  error: UnrecoverableError
}

export function UnrecoverableErrorPage({ error }: UnrecoverableErrorPageProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className='unrecoverable-error-page'>
      <div className='unrecoverable-error-header'>{error.header}</div>
      <div className='unrecoverable-error-message'><b>Message:</b> {error.message}</div>
      { error.type && (
        <div className='unrecoverable-error-type'><b>Type:</b> {error.type}</div>
      )}
      { error.stackTrace && (
        <>
          <div className='unrecoverable-error-stack-trace-header'><b>Stack Trace</b></div>
          <div className='unrecoverable-error-stack-trace'>{error.stackTrace}</div>
        </>
      )}
      { window.electronAPI !== undefined && (
        <div className='unrecoverable-error-buttons'>
          <SimpleButton
            value={copied ? 'Copied to Clipboard' : 'Copy Error'}
            onClick={() => {
              copyErrorToClipboard(error);
              setCopied(true);
            }}/>
          <SimpleButton
            value={'Restart'}
            onClick={() => {
              window.electronAPI?.relaunch();
            }}/>
          <SimpleButton
            value={'Exit'}
            onClick={() => {
              window.electronAPI?.close();
            }}/>
        </div>
      )}

    </div>
  );
}

function copyErrorToClipboard(error: UnrecoverableError) {
  const message =
`${error.header}
Message: ${error.message}
Type: ${error.type || 'None'}
Stack Trace:
${error.stackTrace || 'None'}
`;
  navigator.clipboard.writeText(message);
}
