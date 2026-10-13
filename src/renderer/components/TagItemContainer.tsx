import * as React from 'react';

/** All props of a DIV element (except for "ref"). */
type HTMLDivProps = React.HTMLAttributes<HTMLDivElement>;

export type TagItemContainerProps = HTMLDivProps & {
  onTagSelect?: (event: React.MouseEvent<HTMLDivElement>, tagId: number | undefined) => void;
  /**
   * Find the tag ID of an element (or sub-element) of a game.
   *
   * @param element Element or sub-element of a game.
   * @returns The tag's ID (or undefined if no tag was found).
   */
  findTagId: (element: EventTarget) => number | undefined;
  // Overrides onTagSelect
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

/**
 * A DIV element with additional props that listens for "game item" events that bubbles up.
 * This is more efficient than listening for events on each "game item" individually.
 */

export function TagItemContainer(props: TagItemContainerProps) {
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (props.onClick) { props.onClick(event); }
    if (props.onTagSelect) {
      props.onTagSelect(event, props.findTagId(event.target));
    }
  };

  return (
    <div
      { ...filterDivProps(props) }
      onClick={onClick}>
      {props.children}
    </div>
  );
}

// Create a shallow copy of the props object, but without all non-div element props.
function filterDivProps(props: TagItemContainerProps): React.JSX.IntrinsicElements['div'] {
  const rest: HTMLDivProps & {
    // These need to be explicitly specified: the compiler doesn't infer them correctly.
    realRef?: any;
    onTagSelect?: any;
    findTagId?: any;
  } = Object.assign({}, props);
  delete rest.realRef;
  delete rest.onTagSelect;
  delete rest.findTagId;
  return rest;
}
