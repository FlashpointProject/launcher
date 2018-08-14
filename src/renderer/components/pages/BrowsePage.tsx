import * as React from 'react';
import { IDefaultProps } from '../../interfaces';

export interface IBrowsePageProps extends IDefaultProps {
  
}
export interface IBrowsePageState {

}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {
    };
  }
  
  render() {
    return (
      <div>
        browse it up now
      </div>
    );
  }
}
