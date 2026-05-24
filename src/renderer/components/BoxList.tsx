import { OpenIcon } from './OpenIcon';

export type BoxListProps<ItemType> = {
  indexAttr?: string;
  items: ItemType[];
  onRemove: (dataId: number) => void;
  getIndexAttr: (item: ItemType) => number;
  getItemValue: (item: ItemType) => string;
  getColor?: (item: ItemType) => string | undefined;
  renderIcon?: (item: ItemType) => React.JSX.Element;
  primaryValue?: string;
  changePrimaryValue?: (newPrimary: string) => void;
}

export function BoxList<ItemType>(props: BoxListProps<ItemType>) {
  const indexAttr = props.indexAttr || 'data-index';
  const { items, getItemValue, getIndexAttr, getColor, onRemove } = props;

  const getIcon = (item: ItemType) => {
    if (props.renderIcon) {
      return props.renderIcon(item);
    } else {
      return (
        <OpenIcon
          className='curate-tag__icon'
          color={getColor ? getColor(item) || '#FFFFFF' : '#FFFFFF'}
          icon='x' />
      );
    }
  };

  const renderPrimary = (itemValue: string) => {
    if (props.primaryValue && props.changePrimaryValue) {
      if (itemValue === props.primaryValue) {
        return (
          <div className='curate-tag-primary-icon'>{'(Primary)'}</div>
        );
      } else {
        return (
          <div
            className='curate-tag-primary-icon curate-tag-primary-icon__promote'
            onClick={() => props.changePrimaryValue && props.changePrimaryValue(itemValue)}>
            <OpenIcon
              icon='chevron-top'/>
          </div>
        );
      }
    }
  };

  return (
    <tr>
      <td/>
      <td>
        { items.length > 0 ? (
          items.map((item, index) => {
            const itemValue = getItemValue(item);
            return (
              <div
                className='curate-tag'
                key={index}
                { ...{ [indexAttr]: getIndexAttr(item) } }>
                <div className='curate-tag-inner'
                  onClick={() => {
                    if (onRemove) {
                      onRemove(getIndexAttr(item));
                    }
                  }}>
                  {getIcon(item)}
                  <span className='curate-tag__text'>
                    {itemValue}
                  </span>
                </div>
                {renderPrimary(itemValue)}
              </div>
            );
          })
        ) : undefined }
      </td>
    </tr>
  );
}
