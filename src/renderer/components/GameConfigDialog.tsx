import { FloatingContainer } from './FloatingContainer';
import { OpenIcon } from './OpenIcon';
import { FetchedGameInfo } from '@shared/back/types';
import * as React from 'react';
import { SimpleButton } from './SimpleButton';

export type GameConfigDialogProps = {
  close: () => void;
  info: FetchedGameInfo;
}

export function GameConfigDialog(props: GameConfigDialogProps) {
  // Generate rows
  const rows = React.useMemo(() => {
    return props.info.configs.map((c, idx) => {
      return (
        <div className='game-config-dialog__config' key={idx}>
          <div className='game-config-dialog__config-row'>
            <div className='game-config-dialog__config-left'>
              <div className='game-config-dialog__config-title'>
                {c.name}
              </div>
            </div>
            <div className='game-config-dialog__config-right'>
              <div className='game-config-dialog__config-source-label'>
                {'Source:'}
              </div>
              <div className='game-config-dialog__config-source-value'>
                {c.owner}
              </div>
            </div>
          </div>
          <div className='game-config-dialog__config-row'>
            <div className='game-config-dialog__config-left'>
              <div className='game-config-dialog__config-middlewares'>
                <div className='game-config-dialog__config-middleware-label'>
                  {'Middleware:'}
                </div>
                {c.middleware.map((m, idx) => (
                  <div key={idx}>
                    {`${m.name} (version: ${m.version})`}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='game-config-dialog__config-row'>
            <div className='game-config-dialog__config-left'>
            </div>
            <div className='game-config-dialog__config-right game-config-dialog__config-buttons'>
              <SimpleButton
                value='Delete' />
              <SimpleButton
                value={c.owner === 'local' ? 'Modify' : 'Make Local Copy'} />
            </div>
          </div>
        </div>
      );
    });
  }, [props.info]);

  return (
    <FloatingContainer floatingClassName='game-config-dialog-container'>
      <div className='game-config-dialog'>
        <div className='game-config-dialog-header'>
          <div className='game-config-dialog-header-title'>
            {`Game Configurations: ${props.info.game.title}`}
          </div>
          <div className='game-config-dialog-header-close' onClick={props.close}>
            <OpenIcon icon='x'/>
          </div>
        </div>
        <div className='game-config-dialog-content'>
          {rows}
        </div>
      </div>
    </FloatingContainer>
  );
}
