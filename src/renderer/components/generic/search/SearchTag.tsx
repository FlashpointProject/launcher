import * as React from 'react';
import { IDefaultProps } from '../../../interfaces';
import { ISearchClassNames } from './Search';

export interface ISearchTagProps extends IDefaultProps {
  /** Identifier (should be the same as its index inside its parent <Search> component) */
  id?: number;
  /** Text displayed inside the tag */
  text?: string;
  /** Called when the "Remove Button" is clicked */
  onClickRemove?: (tagEvent: ISearchTagClickRemoveEvent, clickEvent: React.MouseEvent) => void;
  /** Additional class names (the original class names are still applied) */
  classNames?: ISearchClassNames;
}

export interface ISearchTagClickRemoveEvent {
  /** Identifier of the tag */
  id?: number;
  /** Text of the tag */
  text?: string;
}

export class SearchTag extends React.Component<ISearchTagProps, {}> {
  constructor(props: ISearchTagProps) {
    super(props);
    this.onClickRemove = this.onClickRemove.bind(this);
  }
  render() {
    const tag = this.getClassName('search__tag', 'tag');
    const tagText = this.getClassName('search__tag__text', 'tagText');
    const tagRemove = this.getClassName('search__tag__remove', 'tagRemove');
    const tagRemoveInner = this.getClassName('search__tag__remove__inner', 'tagRemoveInner');
    return (
      <div className={tag}>
        <div className={tagText}>
          {this.props.text}
        </div>
        <div className={tagRemove} onClick={this.onClickRemove}>
          <p className={tagRemoveInner}>x</p>
        </div>
      </div>
    );
  }

  /** Called when the "Remove Button" is pressed */
  onClickRemove(e: React.MouseEvent) {
    const onClickRemove = this.props.onClickRemove;
    if (onClickRemove) {
      onClickRemove({
        id: this.props.id,
        text: this.props.text
      }, e);
    }
  }

  getClassName(className: string, propName: string): string {
    if (this.props.classNames) {
      const cn: string = (this.props.classNames as any)[propName] || '';
      if (cn) {
        return className+' '+cn;
      }
    }
    return className;
  }
}
