import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { updatePreferences } from '@renderer/store/preferences/slice';
import { ScaleValues } from 'flashpoint-launcher';
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

const scaleSliderMax = 1000;

export type FooterScalerProps = {
  scaleKey: keyof ScaleValues;
}

export function FooterScaler(props: FooterScalerProps) {
  const { scaleKey } = props;
  const dispatch = useDispatch();
  const scaleValues = useAppSelector((state) => state.preferences.scaleValues);
  const scaleValue = scaleValues[scaleKey];
  const scale = Math.min(Math.max(0, scaleValue), 1);
  const scaleSliderRef = useRef<HTMLInputElement>(null);

  const onScaleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updatePreferences({ scaleValues: {
      ...scaleValues,
      [scaleKey]: Number(event.currentTarget.value) / scaleSliderMax
    } }));
  };

  useEffect(() => {
    const setScaleSliderValue = (scale: number) => {
      if (scaleSliderRef.current) {
        if (scale < 0) { scale = 0; }
        else if (scale > 1) { scale = 1; }
        scaleSliderRef.current.value = (Math.min(Math.max(0, scale), 1) * scaleSliderMax).toFixed(1).toString();
        dispatch(updatePreferences({ scaleValues: {
          ...scaleValues,
          [scaleKey]: scale
        } }));
      }
    };

    const onGlobalKeydown = (event: KeyboardEvent) => {
      const scaleDif = 0.1; // How much the scale should change per increase/decrease
      // Increase Game Scale (CTRL PLUS)
      if (event.ctrlKey && (event.keyCode === 187 || event.keyCode === 61 || event.keyCode === 171)) {
        setScaleSliderValue(scale + scaleDif);
        event.preventDefault();
      }
      // Decrease Game Scale (CTRL MINUS)
      else if (event.ctrlKey && (event.keyCode === 189 || event.keyCode === 173)) {
        setScaleSliderValue(scale - scaleDif);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onGlobalKeydown);

    return () => {
      window.removeEventListener('keydown', onGlobalKeydown);
    };
  }, [scaleKey, scale, dispatch, scaleValues]);

  return (
    <div className='footer__scale-slider__wrapper'>
      {/* Scale Slider */}
      <div className='footer__wrap footer__scale-slider'>
        <div className='footer__scale-slider__inner'>
          <div className='footer__scale-slider__icon footer__scale-slider__icon--left simple-center'>
            <div>-</div>
          </div>
          <div className='footer__scale-slider__icon footer__scale-slider__icon--center simple-center' />
          <div className='footer__scale-slider__icon footer__scale-slider__icon--right simple-center'>
            <div>+</div>
          </div>
          <input
            type='range'
            className='footer__scale-slider__input hidden-slider'
            value={scale * scaleSliderMax}
            min={0}
            max={scaleSliderMax}
            ref={scaleSliderRef}
            onChange={onScaleSliderChange} />
        </div>
      </div>
      {/* Slider Percent */}
      <div className='footer__wrap footer__scale-percent'>
        <p>{Math.round(30 + (scale * 140))}%</p>
      </div>
    </div>
  );
}
