import * as React from 'react';
import { IDefaultProps } from '../interfaces';
import { ILaunchBoxGame } from '../../shared/launchbox/interfaces';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { LaunchBoxGame } from '../../shared/launchbox/LaunchBoxGame';

export interface IGameOrderProps extends IDefaultProps {
  onChange: (event: IGameOrderChangeEvent) => void;
}
export interface IGameOrderState {
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
}

export interface IGameOrderChangeEvent {
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
}

export type GameOrderBy = 'title'|'genre';
export type GameOrderReverse = 'ascending'|'descending';

export class GameOrder extends React.Component<IGameOrderProps, IGameOrderState> {
  constructor(props: IGameOrderProps) {
    super(props);
    this.state = {
      orderBy: 'title',
      orderReverse: 'ascending',
    };
    this.onOrderByChange = this.onOrderByChange.bind(this);
    this.onOrderReverseChange = this.onOrderReverseChange.bind(this);
  }
  
  render() {
    return (
      <>
        <select className="header__order-by" value={this.state.orderBy} onChange={this.onOrderByChange}>
          <option value="title">Title</option>
          <option value="genre">Genre</option>
        </select>
        <select className="header__order-reverse" value={this.state.orderReverse} onChange={this.onOrderReverseChange}>
          <option value="ascending">Ascending</option>
          <option value="descending">Descending</option>
        </select>
      </>
    );
  }
  
  private onOrderByChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const newState: IGameOrderState = {
      orderBy: this.parseOrderBy(event.target.value),
      orderReverse: this.state.orderReverse,
    }
    if (this.props.onChange) {
      this.props.onChange(newState);
    }
    this.setState({
      orderBy: newState.orderBy
    });
  }

  private onOrderReverseChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const newState: IGameOrderState = {
      orderBy: this.state.orderBy,
      orderReverse: this.parseOrderReverse(event.target.value),
    }
    if (this.props.onChange) {
      this.props.onChange(newState);
    }
    this.setState({
      orderReverse: newState.orderReverse
    });
  }

  private parseOrderBy(value: string): GameOrderBy {
    if (value === 'title') return 'title';
    if (value === 'genre') return 'genre';
    throw new Error(`"${value}" is not a valid GameOrderBy`);
  }

  private parseOrderReverse(value: string): GameOrderReverse {
    if (value === 'ascending') return 'ascending';
    if (value === 'descending') return 'descending';
    throw new Error(`"${value}" is not a valid GameOrderReverse`);
  }
}
