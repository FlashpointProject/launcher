import * as React from 'react';
import { LangContainer } from '@shared/lang';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { LangContext } from '../util/lang';
import { ModelUtils } from '@shared/game/util';
import { Game } from '@database/entity/Game';

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

export interface GameOrder {
  context: LangContainer;
}

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
          <option value='platform'>{strings.platform}</option>
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
    this.updateOrder({
      orderBy: validateOrderBy(event.target.value),
    });
  }

  onOrderReverseChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.updateOrder({
      orderReverse: validateOrderReverse(event.target.value),
    });
  }

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

/**
 * Validate a value to be a "GameOrderBy" string (throws an error if non-existant or excluded).
 * @param value Value to validate.
 * @returns The same value as the first argument as a GameOrderBy obj
 */
function validateOrderBy(value: string): GameOrderBy {
  switch (value) {
    case 'tags': throw new Error(`"${value}" is not a valid GameOrderBy`);
    default:     return value as keyof Game;
  }
}

/**
 * Validate a value to be a "GameOrderReverse" string (throws an error if invalid).
 * @param value Value to validate.
 * @returns The same value as the first argument.
 */
function validateOrderReverse(value: string): GameOrderReverse {
  switch (value) {
    case 'ASC':  return 'ASC';
    case 'DESC': return 'DESC';
    default: throw new Error(`"${value}" is not a valid GameOrderReverse`);
  }
}
