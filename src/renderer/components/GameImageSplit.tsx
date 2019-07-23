import * as React from 'react';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

type GameImageSplitProps = {
  /** What to call the image (perhaps the type or purpose of the image). */
  text: string;
  /** Source of the image (undefined if there is no image). */
  imgSrc?: string;
  /** Called when the "add" button is clicked. This button is only shown while there is no image. */
  onAddClick: () => void;
  /** Called when the "remove" button is clicked. This button is only shown while there is an image. */
  onRemoveClick: () => void;
  /** Called when something is dropped on this component. */
  onDrop: (event: React.DragEvent, text: string) => void;
  /** If the user should not be able to add a new image. */
  disabled?: boolean;
};

type GameImageSplitState = {
  /** If the cursor is dragging something over this element. */
  hover: boolean;
};

/**
 * An "image slot" inside the "game image split" area.
 * This component will either display a text and an "add" button, or an image and a "remove" button (depending on if the image source is undefined).
 * It's meant to be used for displaying the current, or allowing the user to add a new, image for a game.
 */
export class GameImageSplit extends React.Component<GameImageSplitProps, GameImageSplitState> {
  constructor(props: GameImageSplitProps) {
    super(props);
    this.state = {
      hover: false,
    };
  }

  render() {
    const { disabled, imgSrc, onAddClick, onRemoveClick, text } = this.props;
    const { hover } = this.state;
    // Class name
    let className = 'game-image-split';
    if (imgSrc === undefined) { className += ' simple-center'; }
    if (hover)                { className += ' game-image-split--hover'; }
    if (disabled)             { className += ' game-image-split--disabled'; }
    // Render
    return (
      <div
        className={className}
        style={{ backgroundImage: `url("${imgSrc}")` }}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDrop={this.onDrop}>
        { (imgSrc === undefined) ? (
          <div className='game-image-split__not-found'>
            <h1>No {text} Found</h1>
            <SimpleButton
              value={`Add ${text}`}
              onClick={onAddClick}
              disabled={disabled}/>
          </div>
        ) : (
          <div className='game-image-split__buttons'>
            <p>{text}</p>
            <ConfirmElement
              onConfirm={onRemoveClick}
              children={renderDeleteImageButton}/>
          </div>
        ) }
      </div>
    );
  }

  onDragOver = (event: React.DragEvent): void => {
    if (this.props.imgSrc === undefined) {
      const types = event.dataTransfer.types;
      if (types.length === 1 && types[0] === 'Files') {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        if (!this.state.hover) { this.setState({ hover: true }); }
      }
    }
  }

  onDrop = (event: React.DragEvent): void => {
    if (this.state.hover) { this.setState({ hover: false }); }
    if (this.props.imgSrc === undefined) { this.props.onDrop(event, this.props.text); }
  }

  onDragLeave = (event: React.DragEvent): void => {
    if (this.state.hover) { this.setState({ hover: false }); }
  }
}

function renderDeleteImageButton({ activate, activationCounter, reset }: ConfirmElementArgs): JSX.Element {
  return (
    <div
      className={
        'game-image-split__buttons__remove-image' +
        ((activationCounter > 0) ? ' game-image-split__buttons__remove-image--active simple-vertical-shake' : '')
      }
      title='Delete Image (delete ALL images of this game of the same type)'
      onClick={activate}
      onMouseLeave={reset}>
      <OpenIcon icon='trash' />
    </div>
  );
}
