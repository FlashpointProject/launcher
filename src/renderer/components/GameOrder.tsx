import { gameOrderByOptions } from '@shared/order/util';
import { GameOrderBy, GameOrderReverse, Game } from 'flashpoint-launcher';
import * as React from 'react';
import { LangContext } from '../util/lang';

export type GameOrderProps = {
  /** Called when the either the property to order by, or what way to order in, is changed. */
  onChange?: (event: GameOrderChangeEvent) => void;
  /** What property to order the games by. */
  orderBy: GameOrderBy;
  /** What way to order the games in. */
  orderReverse: GameOrderReverse;
};

/** Object emitted when the game order changes. */
export type GameOrderChangeEvent = {
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
};

/**
 * Two drop down lists, the first for selecting what to order the games by, and
 * the second for selecting what way to order the games in.
 */
export class GameOrder extends React.Component<GameOrderProps> {
  render() {
    const strings = this.context.filter;
    return (
      <>
        {/* Order By */}
        <select
          className='simple-selector'
          value={this.props.orderBy}
          onChange={this.onOrderByChange}>
          <option value='dateAdded'>{strings.dateAdded}</option>
          <option value='dateModified'>{strings.dateModified}</option>
          <option value='series'>{strings.series}</option>
          <option value='title'>{strings.title}</option>
          <option value='developer'>{strings.developer}</option>
          <option value='publisher'>{strings.publisher}</option>
        </select>
        {/* Order Reverse */}
        <select
          className='simple-selector'
          value={this.props.orderReverse}
          onChange={this.onOrderReverseChange}>
          <option value='ASC'>{strings.ascending}</option>
          <option value='DESC'>{strings.descending}</option>
        </select>
      </>
    );
  }

  onOrderByChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (isOrderBy(event.target.value)) {
      this.updateOrder({ orderBy: event.target.value });
    } else {
      console.error(`Failed to set "Order By". Value is invalid! (value: "${event.target.value}")`);
    }
  };

  onOrderReverseChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (isOrderReverse(event.target.value)) {
      this.updateOrder({ orderReverse: event.target.value });
    } else {
      console.error(`Failed to set "Order Reverse". Value is invalid! (value: "${event.target.value}")`);
    }
  };

  updateOrder(data: Partial<GameOrderChangeEvent>): void {
    if (this.props.onChange) {
      this.props.onChange({
        orderBy:      data.orderBy      || this.props.orderBy,
        orderReverse: data.orderReverse || this.props.orderReverse,
      });
    }
  }

  static contextType = LangContext;
}

function isOrderBy(value: string): value is GameOrderBy {
  return (gameOrderByOptions.indexOf(value as keyof Game) >= 0);
}

function isOrderReverse(value: string): value is GameOrderReverse {
  return (value === 'ASC' || value === 'DESC');
}
