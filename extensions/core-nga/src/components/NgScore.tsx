import { GameComponentProps } from 'flashpoint-launcher-renderer';
import { ExtData } from './types';

export default function NgScore(props: GameComponentProps) {
  const extData: ExtData | undefined = props.game.extData?.nga;
  const { GameComponentInputField } = window.ext.components;
  const score = Number(extData?.score) || 0;
  const { updateGameExtData, editable } = props;

  return editable ? (
    <GameComponentInputField
      header='NG Score'
      text={score.toString()}
      placeholder='No Score'
      onChange={(value) => {
        // Strip leading zeroes
        const cleanValue = value.replace(/^0+/, '');
        // Make sure we're a numeric (allow decimals)
        if (/^-?\d+(\.\d+)?$/.test(cleanValue)) {
          updateGameExtData('nga', 'score', Number(cleanValue));
        }
      }}
      {...props} />
  ) : (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>NG Score: </p>
      {!score ? (
        <p>None</p>
      ) : (
        <div className={'ng-score-sidebar'}>
          <div className='ng-score-value'>{score.toFixed(2)}</div>
          <div className='ng-score-stars'>
            <div className='ng-score-stars-filled' style={{ clipPath: `inset(0 ${(1 - (score / 5)) * 100}% 0 0)` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
