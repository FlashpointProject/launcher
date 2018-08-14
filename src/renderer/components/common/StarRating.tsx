import * as React from 'react';
import { IDefaultProps } from '../../interfaces';

export interface IStarRatingProps extends IDefaultProps {
  rating?: number;
}

export const StarRating: React.StatelessComponent<IStarRatingProps> = (props: IStarRatingProps) => {
  const { rating = 0 } = props;
  const width: number = (rating/5)*60;
  return (
    <ul className="star-rating-dark">
      <li className="current-rating" style={{width: width+'px'}}>Currently {rating}/5 Stars.</li>
    </ul>
  );
};