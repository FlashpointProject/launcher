import * as React from 'react';
import { IDefaultProps } from '../interfaces';

export interface IGameOrderProps extends IDefaultProps {
  onChange?: (event: IGameOrderChangeEvent) => void;
}
export interface IGameOrderState {
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
}

export interface IGameOrderChangeEvent {
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
}

interface IOptionalGameOrderState {
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
}

export type GameOrderBy = 'dateAdded'|'genre'|'platform'|'series'|'title';
export type GameOrderReverse = 'ascending'|'descending';

export class GameOrder extends React.Component<IGameOrderProps, IGameOrderState> {
  constructor(props: IGameOrderProps) {
    super(props);
    this.state = {
      orderBy: 'title',
      orderReverse: 'ascending',
    };
  }

  render() {
    return (
      <>
        {/* Order By */}
        <select className='simple-selector' value={this.state.orderBy} onChange={this.onOrderByChange}>
          <option value='dateAdded'>Date Added</option>
          <option value='genre'>Genre</option>
          <option value='platform'>Platform</option>
          <option value='series'>Series</option>
          <option value='title'>Title</option>
        </select>
        {/* Order Reverse */}
        <select className='simple-selector' value={this.state.orderReverse} onChange={this.onOrderReverseChange}>
          <option value='ascending'>Ascending</option>
          <option value='descending'>Descending</option>
        </select>
      </>
    );
  }

  private onOrderByChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.updateState({
      orderBy: this.parseOrderBy(event.target.value),
    });
  }

  private onOrderReverseChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.updateState({
      orderReverse: this.parseOrderReverse(event.target.value),
    });
  }

  private updateState(data: IOptionalGameOrderState): void {
    // (The state and event are currently identical, so if this uses just one of their interfaces)
    const newStateAndEvent: IGameOrderChangeEvent = {
      orderBy:      data.orderBy      || this.state.orderBy,
      orderReverse: data.orderReverse || this.state.orderReverse,
    }
    if (this.props.onChange) {
      this.props.onChange(newStateAndEvent);
    }
    this.setState(newStateAndEvent);
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
