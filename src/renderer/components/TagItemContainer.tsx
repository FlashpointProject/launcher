import * as React from 'react';

/** All props of a DIV element (except for "ref"). */
type HTMLDivProps = React.HTMLAttributes<HTMLDivElement>;

export type TagItemContainerProps = HTMLDivProps & {
  /** Reference to the underlying DIV element. */
  realRef?: JSX.IntrinsicElements['div']['ref'];
  onTagSelect?: (event: React.MouseEvent<HTMLDivElement>, tagId: number | undefined) => void;
  /**
   * Find the tag ID of an element (or sub-element) of a game.
   * @param element Element or sub-element of a game.
   * @returns The tag's ID (or undefined if no tag was found).
   */
  findTagId: (element: EventTarget) => number | undefined;
};

/**
 * A DIV element with additional props that listens for "game item" events that bubbles up.
 * This is more efficient than listening for events on each "game item" individually.
 */
export class TagItemContainer extends React.Component<TagItemContainerProps> {
  render() {
    return (
      <div
        { ...filterDivProps(this.props) }
        ref={this.props.realRef}
        onClick={this.onClick}
        children={this.props.children} />
    );
  }

  onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onClick) { this.props.onClick(event); }
    if (this.props.onTagSelect) {
      this.props.onTagSelect(event, this.findTagId(event.target));
    }
  }

  /** Short-hand for "props.findGameId". */
  findTagId(target: EventTarget): number | undefined {
    return this.props.findTagId(target);
  }
}

/**
 * Create a shallow copy of the props object, but without all non-div element props.
 * @param props Properties to copy.
 */
function filterDivProps(props: TagItemContainerProps): JSX.IntrinsicElements['div'] {
  const rest = Object.assign({}, props);
  delete rest.realRef;
  delete rest.onTagSelect;
  delete rest.findTagId;
  return rest;
}
