import * as React from 'react';
import { IDefaultProps } from '../../interfaces';

declare function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;

export interface ICarouselProps extends IDefaultProps {
  /** Index of slide this is currently scrolling towards */
  target?: number;
  /** Time it takes to slide from one index to another (in miliseconds) */
  animationTime?: number;
  /** */
  stepFunction?: (prog: number) => number;
  // Generic boring stuff
  id?: string;
  className?: string;
}

export class Carousel extends React.Component<ICarouselProps, {}> {
  private _intervalId: number = -1;
  private _slideRef: React.RefObject<HTMLUListElement> = React.createRef();
  /** Time left before the sliding should be done (stars at props.animationTime and goes to 0) */
  private _timeLeft: number = 0;
  /** Time-stamp from previous onTick call (or render call the target was changed) */
  private _timeStamp: number = 0;
  /** The value of props.target from the most recent render call */
  private _lastTarget: number = 0;
  /** If the carousel is currently "sliding" (moving towards the target index) */
  private _isSliding: boolean = false;
  private _startX: number = 0;
  private _endX: number = 0;

  constructor(props: ICarouselProps) {
    super(props);
    this.state = {
    };
    this.onTick = this.onTick.bind(this);
  }

  render() {
    const target: number = this.props.target || 0;
    // Check if target was changed from previous render
    if (target !== this._lastTarget) {
      // Update the target index
      this._lastTarget = target;
      // Initialize sliding towards the new target
      this._isSliding = true;
      this._timeLeft = this.props.animationTime || 0;
      this._timeStamp = Date.now();
      // Calculate current x and the x of the target
      this._startX = this.getX();
      this._endX = this.calcEndX();
    }
    //
    return (
      <div id={this.props.id} className={this.props.className} style={{visibility: 'visible'}}>
        <div className="carousel-clip-region viewport">
          <ul className="carousel-list carousel-horizontal overview" ref={this._slideRef}>
            {this.props.children}
          </ul>
        </div>
      </div>
    );
  }

  componentDidMount() {
    this._intervalId = setInterval(this.onTick, 1);
  }

  componentWillUnmount() {
    clearInterval(this._intervalId);
    this._intervalId = -1;
  }

  onTick() {
    // Skip if not sliding
    if (!this._isSliding) { return; }
    // Update timing
    let timeStamp: number = Date.now();
    let lastTimeStamp: number = this._timeStamp;
    this._timeStamp = timeStamp;
    this._timeLeft = Math.max(0, this._timeLeft - (timeStamp - lastTimeStamp));
    if (this._timeLeft === 0) {
      this._isSliding = false;
    }
    // Calculate and set current x
    const prog: number = 1 - (this._timeLeft / (this.props.animationTime||0));
    const stepFunc = this.props.stepFunction || this.defaultStepFunction;
    this.setX(this._startX + (this._endX - this._startX) * stepFunc(prog));
  }

  private defaultStepFunction(prog: number): number {
    return prog;
  }

  private setX(x: number): void {
    if (!this._slideRef.current) { throw new Error('Carousel slider element missing!'); }
    this._slideRef.current.style.left = `${x}px`;
  }
  private getX(): number {
    if (!this._slideRef.current) { throw new Error('Carousel slider element missing!'); }
    return parseFloat(this._slideRef.current.style.left||'') || 0;
  }

  private calcEndX(): number {
    if (!this._slideRef.current) { throw new Error('Carousel slider element missing!'); }
    const overview = this._slideRef.current;
    let targetIndex: number = Math.min(Math.max(0, this.props.target||0), overview.children.length-2);
    let targetElement: Element = overview.children.item(targetIndex);
    let overviewLeft: number = overview.getBoundingClientRect().left;
    let targetLeft: number = targetElement.getBoundingClientRect().left;
    return -(targetLeft-overviewLeft) + 6;
  }

  /**
   * Calculate a new index
   * @param index Index before calculations
   * @param length Number of elements inside the carousel
   * @param loop If the index should loop/wrap around the edges of the carousel
   * @returns Index after calculations
   */
  public static calculateIndex(index: number, length: number, loop: boolean = false): number {
    //
    if (loop) {
      if (index > length - 2) {
        return index % (length - 1);
      }
      if (index < 0) {
        return (index % length) + length - 1;
      }
      return index;
    } else {
      return Math.min(Math.max(0, index), length - 2);
    }
  }
}
