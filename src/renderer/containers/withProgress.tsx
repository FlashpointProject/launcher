import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { Subtract } from '@shared/interfaces';

export type ProgressData = {
  /** Percent done. */
  percentDone: number;
  /** Whether to use percentDone (info for progress components). */
  usePercentDone: boolean;
  /** If bar is finished (now invisible). */
  isDone: boolean;
  /** Text to display (primary). */
  text?: string;
  /** Text to display (secondary). */
  secondaryText?: string;
  /** Callback to increment num of items. */
  incItems(): void;
  /** Callback to increment num of items. */
  setTotalItems(total: number): void;
  /** Callback to reset the progress state. */
  newProgress(usingPercent: boolean): void;
  /** Callback to set percent filled. */
  setPercentDone(percent: number): void;
  /** Callback to set done (now invisible). */
  setIsDone(): void;
  /** Callback to set the primary text. */
  setText(text: string): void;
  /** Callback to set the secondary text. */
  setSecondaryText(text: string): void;
}

export type WithProgressProps = {
  progressData: ProgressData;
}

type ItemsCountAction = 'increment' | 'clear';
const initialItemsCount = 0;

export function withProgress<T extends WithProgressProps>(Component: React.ComponentType<T>) {
  return function WithProgress(props: Subtract<T, WithProgressProps>) {
    // Holds state used internally
    const [itemCount, setItemCount] = React.useReducer(itemCountReducer, initialItemsCount);
    const [totalItems, setTotalItems] = React.useState(0);
    const [percentDone, setPercentDone] = React.useState(0);
    const [usePercentDone, setUsePercentDone] = React.useState(true);
    const [isDone, setIsDone] = React.useState(true);
    const [text, setText] = React.useState<string | undefined>();
    const [secondaryText, setSecondaryText] = React.useState<string | undefined>();

    // Increment items, produce new percentDone and state
    const incItems = useCallback(() => {
      setItemCount('increment');
    }, [setItemCount]);

    // Set progress as done, unless specified as false
    const setIsDoneCallback = useCallback((isDone: boolean = true) => {
      setIsDone(isDone);
    }, [setIsDone]);

    // Reset the progress
    const newProgress = useCallback((usePercentDone: boolean) => {
      console.log('NEW');
      setItemCount('clear');
      setTotalItems(0);
      setPercentDone(0);
      setUsePercentDone(usePercentDone);
      setIsDone(false);
      setText(undefined);
      setSecondaryText(undefined);
    }, [setTotalItems, setPercentDone, setIsDone, setText, setSecondaryText]);

    React.useEffect(() => {
      if (totalItems > 0) {
        setPercentDone(Math.min((itemCount / totalItems) * 100, 100));
      }
    }, [itemCount, totalItems]);

    // Prop for child component
    const progressData: ProgressData = useMemo(() => {
      return {
        percentDone: percentDone,
        usePercentDone: usePercentDone,
        isDone: isDone,
        text: text,
        secondaryText: secondaryText,
        incItems: incItems,
        setTotalItems: setTotalItems,
        newProgress: newProgress,
        setPercentDone: setPercentDone,
        setIsDone: setIsDoneCallback,
        setText: setText,
        setSecondaryText: setSecondaryText
      };
    }, [itemCount, totalItems, percentDone, isDone, text, secondaryText]);

    return (
      <Component {...props as T}
        progressData={progressData} />
    );
  };
}

function itemCountReducer(prevState: number, action: ItemsCountAction): number {
  switch (action) {
    case 'increment':
      return prevState + 1;
    case 'clear':
      return 0;
  }
  return prevState;
}
