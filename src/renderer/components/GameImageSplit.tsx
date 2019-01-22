import * as React from 'react';
import { SimpleButton } from './SimpleButton';
import { ConfirmElement, IConfirmElementArgs } from './ConfirmElement';
import { OpenIcon } from './OpenIcon';

interface IGameImageSplitProps {
  text: string;
  imgSrc?: string;
  onAddClick: () => void;
  onRemoveClick: () => void;
  onDrop: (event: React.DragEvent, text: string) => void;
}

interface IGameImageSplitState {
  hover: boolean;
};

export class GameImageSplit extends React.Component<IGameImageSplitProps, IGameImageSplitState> {
  constructor(props: IGameImageSplitProps) {
    super(props);
    this.state = { hover: false };
  }

  render() {
    const { text, imgSrc, onAddClick, onRemoveClick } = this.props;
    const { hover } = this.state;
    return (
      <div className={'game-image-split' +
                      ((imgSrc === undefined) ? ' simple-center' : '') +
                      (hover ? ' game-image-split--hover' : '')}
          style={{ backgroundImage: `url("${imgSrc}")` }}
          onDragOver={this.onDragOver}
          onDragLeave={this.onDragLeave}
          onDrop={this.onDrop}>
        { (imgSrc === undefined) ? (
          <div className='game-image-split__not-found'>
            <h1>{`No ${text} Found`}</h1>
            <SimpleButton value={`Add ${text}`} onClick={onAddClick}/>
          </div>
        ) : (
          <div className='game-image-split__buttons'>
            <p>{text}</p>
            <ConfirmElement onConfirm={onRemoveClick} children={renderDeleteImageButton}/>
          </div>
        ) }
      </div>
    );
  }

  private onDragOver = (event: React.DragEvent): void => {
    if (this.props.imgSrc !== undefined) { return; }
    const types = event.dataTransfer.types;
    if (types.length === 1 && types[0] === 'Files') {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (!this.state.hover) { this.setState({ hover: true }); }
    }
  }

  private onDrop = (event: React.DragEvent): void => {
    if (this.state.hover) { this.setState({ hover: false }); }
    if (this.props.imgSrc !== undefined) { return; }
    this.props.onDrop(event, this.props.text);
  }

  private onDragLeave = (event: React.DragEvent): void => {
    if (this.state.hover) { this.setState({ hover: false }); }
  }
}

function renderDeleteImageButton({ activate, activationCounter, reset }: IConfirmElementArgs): JSX.Element {
  return (
    <div className={'game-image-split__buttons__remove-image'+
                    ((activationCounter>0)?' game-image-split__buttons__remove-image--active simple-vertical-shake':'')}
         title='Delete Image (delete ALL images of this game of the same type)'
         onClick={activate} onMouseLeave={reset}>
      <OpenIcon icon='trash' />
    </div>
  );
}
