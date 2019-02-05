import * as React from 'react';
import { IDefaultProps } from '../interfaces';
import { GameOrderBy, GameOrderReverse } from '../../shared/order/interfaces';

export interface IGameOrderProps extends IDefaultProps {
  onChange?: (event: IGameOrderChangeEvent) => void;
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
}

export interface IGameOrderChangeEvent {
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
}

export class GameOrder extends React.Component<IGameOrderProps> {
  constructor(props: IGameOrderProps) {
    super(props);
  }

  render() {
    return (
      <>
        {/* Order By */}
        <select className='simple-selector' value={this.props.orderBy} onChange={this.onOrderByChange}>
          <option value='dateAdded'>Date Added</option>
          <option value='genre'>Genre</option>
          <option value='platform'>Platform</option>
          <option value='series'>Series</option>
          <option value='title'>Title</option>
        </select>
        {/* Order Reverse */}
        <select className='simple-selector' value={this.props.orderReverse} onChange={this.onOrderReverseChange}>
          <option value='ascending'>Ascending</option>
          <option value='descending'>Descending</option>
        </select>
      </>
    );
  }

  private onOrderByChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.updateOrder({
      orderBy: this.parseOrderBy(event.target.value),
    });
  }

  private onOrderReverseChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.updateOrder({
      orderReverse: this.parseOrderReverse(event.target.value),
    });
  }

  private updateOrder(data: Partial<IGameOrderChangeEvent>): void {
    if (this.props.onChange) {
      this.props.onChange({
        orderBy:      data.orderBy      || this.props.orderBy,
        orderReverse: data.orderReverse || this.props.orderReverse,
      });
    }
  }

  /** Parse GameOrderBy from a string (error if invalid) */
  private parseOrderBy(value: string): GameOrderBy {
    switch (value) {
      case 'dateAdded': return 'dateAdded';
      case 'genre':     return 'genre';
      case 'platform':  return 'platform';
      case 'series':    return 'series';
      case 'title':     return 'title';
      default: throw new Error(`"${value}" is not a valid GameOrderBy`);
    }
  }

  /** Parse GameOrderReverse from a string (error if invalid) */
  private parseOrderReverse(value: string): GameOrderReverse {
    switch (value) {
      case 'ascending':  return 'ascending';
      case 'descending': return 'descending';
      default: throw new Error(`"${value}" is not a valid GameOrderReverse`);
    }
  }
}
