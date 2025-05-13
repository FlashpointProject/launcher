import { GameComponentProps } from 'flashpoint-launcher-renderer';
import { ExtData } from './types';
import { FaTrophy } from 'react-icons/fa';

export default function NgTrophies(props: GameComponentProps) {
  const extData: ExtData | undefined = props.game.extData?.nga;
  const trophies = extData?.trophies || [];

  if (trophies.length === 0) {
    return <></>;
  }

  return (
    <div className='ng-trophies'>
      <p>Trophies:</p>
      {trophies.map((trophy, index) => (
        <div key={index} className='ng-trophy'>
          <div className='ng-trophy__icon'>
            <FaTrophy/>
          </div>
          <div className='ng-trophy__info'>
            <div className='ng-trophy__name'>{trophy[0]}</div>
            <div className='ng-trophy__date'>{trophy[1]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
