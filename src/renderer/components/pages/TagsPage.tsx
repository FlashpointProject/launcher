import * as React from 'react';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';

type OwnProps = {

}

export type TagsPageProps = OwnProps & WithTagCategoriesProps;

export type TagsPageState = {

}

export class TagsPage extends React.Component<TagsPageProps, TagsPageState> {

  render() {
    return (
      <div className='tags-page'>

      </div>
    );
  }
}