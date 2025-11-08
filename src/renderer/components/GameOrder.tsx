import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { ExtOrder, GameOrderBy, GameOrderReverse } from 'flashpoint-launcher';
import * as React from 'react';

export type GameOrderProps = {
  /** Called when the either the property to order by, or what way to order in, is changed. */
  onChange?: (event: GameOrderChangeEvent) => void;
  /** What property to order the games by. */
  orderBy: GameOrderBy;
  /** Extension order settings */
  extOrder: ExtOrder;
  /** What way to order the games in. */
  orderReverse: GameOrderReverse;
};

/** Object emitted when the game order changes. */
export type GameOrderChangeEvent = {
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
  extOrder: ExtOrder;
};

/**
 * Two drop down lists, the first for selecting what to order the games by, and
 * the second for selecting what way to order the games in.
 */
export function GameOrder(props: GameOrderProps) {
  const allStrings = useLocalization();
  const orderables = useAppSelector(state => state.main.extOrderables);
  const strings = allStrings.filter;

  const onOrderByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const orderBy = event.target.value as GameOrderBy;
    const extId = event.target.selectedOptions[0].getAttribute('ext-id');
    const extKey = event.target.selectedOptions[0].getAttribute('ext-key');
    const extOrderable = orderables.find(e => e.extId === extId && e.key === extKey);
    console.log(`selected ${extId} ${extKey}`);
    if (extOrderable) {
      updateOrder({ orderBy }, extOrderable);
    } else {
      updateOrder({ orderBy }, {
        extId: '',
        key: '',
        default: ''
      });
    }
  };

  const onOrderReverseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isOrderReverse(event.target.value)) {
      updateOrder({ orderReverse: event.target.value }, props.extOrder);
    } else {
      console.error(`Failed to set "Order Reverse". Value is invalid! (value: "${event.target.value}")`);
    }
  };

  const updateOrder = (data: Partial<GameOrderChangeEvent>, extOrder: ExtOrder) => {
    if (props.onChange) {
      props.onChange({
        orderBy: data.orderBy || props.orderBy,
        orderReverse: data.orderReverse || props.orderReverse,
        extOrder,
      });
    }
  };

  // Only apply ext selection if it exists
  const extOrderables = orderables.map(e => `ext_${e.extId}_${e.key}`);
  let selected: string = props.orderBy;
  if (props.extOrder) {
    const extOrderKey = `ext_${props.extOrder.extId}_${props.extOrder.key}`;
    if (extOrderables.includes(extOrderKey)) {
      selected = extOrderKey;
    }
  }

  return (
    <>
      {/* Order By */}
      <select
        className='search-selector search-bar-order-dropdown'
        value={selected}
        onChange={onOrderByChange}>
        <option value='title'>{strings.title}</option>
        <option value='developer'>{strings.developer}</option>
        <option value='publisher'>{strings.publisher}</option>
        <option value='series'>{strings.series}</option>
        <option value='platform'>{strings.platform}</option>
        <option value='releaseDate'>{allStrings.browse.releaseDate}</option>
        <option value='dateAdded'>{strings.dateAdded}</option>
        <option value='dateModified'>{strings.dateModified}</option>
        <option value='lastPlayed'>{allStrings.browse.lastPlayed}</option>
        <option value='playtime'>{allStrings.browse.playtime}</option>
        { orderables.map((orderable) => {
          return (
            <option
              ext-id={orderable.extId}
              ext-key={orderable.key}
              value={`ext_${orderable.extId}_${orderable.key}`}>
              {orderable.title}
            </option>
          );
        })}
      </select>
      {/* Order Reverse */}
      <select
        className='search-selector search-bar-order-dropdown'
        value={props.orderReverse}
        onChange={onOrderReverseChange}>
        <option value='ASC'>{strings.ascending}</option>
        <option value='DESC'>{strings.descending}</option>
      </select>
    </>
  );
}

function isOrderReverse(value: string): value is GameOrderReverse {
  return (value === 'ASC' || value === 'DESC');
}
