import { DropdownItem, GameComponentProps } from 'flashpoint-launcher-renderer';
import { ExtData } from './types';

export default function NgRating(props: GameComponentProps) {
  const extData: ExtData | undefined = props.game.extData?.nga;
  const { GameComponentDropdownSelectField } = window.ext.components;
  const rating = extData?.rating || '';
  const { editable } = props;

  const items: DropdownItem[] = [{
    key: '',
    value: 'None',
  }, {
    key: 'e',
    value: 'Everyone'
  }, {
    key: 't',
    value: 'Teen'
  }, {
    key: 'm',
    value: 'Mature'
  }, {
    key: 'a',
    value: 'Adult'
  }, {
    key: 'u',
    value: 'Unknown'
  }];

  return editable ? (
    <GameComponentDropdownSelectField
      header='NG Rating'
      text={rating}
      placeholder='No Rating'
      items={items}
      onChange={(value) => props.updateGameExtData('nga', 'rating', value)}
      {...props} />
  ) : (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>NG Rating: </p>
      {rating === '' ? (
        <p>None</p>
      ) : (
        <div className={`ng-rating-sidebar ng-image-rating_${rating.toLowerCase()}`}></div>
      )}
    </div>
  );
}
