import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { setTagCategories } from '@renderer/store/tagCategories/slice';
import { Subtract } from '@shared/interfaces';
import { TagCategory } from 'flashpoint-launcher';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

type TagCategoriesStateProps = {
  tagCategories: TagCategory[]
};

export type WithTagCategoriesProps = TagCategoriesStateProps & ReturnType<typeof mapDispatchToProps>;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    setTagCategories: (tagCats: TagCategory[]) => dispatch(setTagCategories(tagCats)),
  };
}

export function withTagCategories<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithTagCategoriesProps>) => {
    const stateProps: TagCategoriesStateProps = useAppSelector(state => ({
      tagCategories: state.tagCategories
    }));
    const dispatch = useDispatch();
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
