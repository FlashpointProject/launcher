import { useMouse } from '@renderer/hooks/useMouse';
import { findElementAncestor } from '@renderer/Util';
import { OpenIcon } from './OpenIcon';

export type BoxListProps<ItemType> = {
  indexAttr?: string;
  items: ItemType[];
  onRemove: (dataId: number) => void;
  getIndexAttr: (item: ItemType) => number;
  getItemValue: (item: ItemType) => string;
  getColor?: (item: ItemType) => string | undefined;
}

export function BoxList<ItemType>(props: BoxListProps<ItemType>) {
  const indexAttr = props.indexAttr || 'data-index';
  const { items, getItemValue, getIndexAttr, getColor, onRemove } = props;

  const [onTagMouseDown, onTagMouseUp] = useMouse<number>(() => ({
    chain_delay: 500,
    find_id: (event) => {
      let dataId: number | undefined;
      try { dataId = findAncestorRowDataIndex(event.target as Element, indexAttr); }
      catch (error) { console.error(error); }
      return dataId;
    },
    on_click: (event, dataId, clicks) => {
      if (event.button === 0 && clicks === 1) { // Single left click
        onRemove(dataId);
      }
    },
  }), [props.onRemove]);

  return (
    <tr>
      <td/>
      <td
        onMouseDown={onTagMouseDown}
        onMouseUp={onTagMouseUp}>
        { items.length > 0 ? (
          items.map((item, index) => {
            return (
              <div
                className='curate-tag'
                key={index}
                { ...{ [indexAttr]: getIndexAttr(item) } }>
                <OpenIcon
                  className='curate-tag__icon'
                  color={getColor ? getColor(item) || '#FFFFFF' : '#FFFFFF'}
                  icon='x' />
                <span className='curate-tag__text'>
                  {getItemValue(item)}
                </span>
              </div>
            );
          })
        ) : undefined }
      </td>
    </tr>
  );
}

function findAncestorRowDataIndex(element: Element, dataIndex: string): number | undefined {
  const ancestor = findElementAncestor(element, target => target.getAttribute(dataIndex) !== null, true);
  if (!ancestor) { return undefined; }

  const index = ancestor.getAttribute(dataIndex);
  if (typeof index !== 'string') { throw new Error('Failed to get attribute from ancestor!'); }

  return (index as any) * 1; // Coerce to number
}
