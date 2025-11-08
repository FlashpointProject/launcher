import { createSelector } from '@reduxjs/toolkit';
import { Content, Game } from 'flashpoint-launcher';
import { GameComponentProps, RootState } from 'flashpoint-launcher-renderer';
import { useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import React from 'react';
import { ControllerSet, getFormattedMappedName } from '../shared';

function isGame(content?: Content | Game): content is Game {
  return content !== undefined && 'legacyApplicationPath' in content;
}

export const selectGameField = <K extends keyof Game>(viewId: string, key: K) => createSelector(
  [
    (state: RootState) => state.search.views[viewId].isEditing,
    (state: RootState) => isGame(state.search.views[viewId].selectedGame) ? state.search.views[viewId].selectedGame[key] : undefined,
    (state: RootState) => isGame(state.search.views[viewId].editingGame) ? state.search.views[viewId].editingGame[key] : undefined
  ],
  (isEditing, selectedGameValue, editingGameValue) => (isEditing ? editingGameValue : selectedGameValue) as Game[K]
);

export default function ControllerSupport(props: GameComponentProps) {
  const extData = useAppSelector(selectGameField(props.viewId, 'extData'));
  const controllerConfig: ControllerSet | undefined = extData?.controller?.config;

  const mappedTable = React.useMemo(() => {
    if (!controllerConfig) {
      return <></>;
    }

    const list: React.JSX.Element[] = [];
    let isDpadSameAsLeftStick = false;

    const leftStick = controllerConfig.stick ? controllerConfig.stick.find(s => s.name === 'Left Stick') : undefined;
    const rightStick = controllerConfig.stick ? controllerConfig.stick.find(s => s.name === 'Right Stick') : undefined;

    if (controllerConfig.dpad && leftStick) {
      let allMatch = true;
      for (const button of controllerConfig.dpad.dpadbutton) {
        const stickButton = leftStick.stickbutton.find(s => s.name === button.name);
        if (stickButton) {
          if (stickButton.slots.slot.code !== button.slots.slot.code ||
            stickButton.slots.slot.mode !== button.slots.slot.mode) {
            // Input is not equal
            allMatch = false;
          }
        } else {
          // Input does not exists, therefore also not equal
          allMatch = false;
        }
      }
      // Save result so we can reference it later
      isDpadSameAsLeftStick = allMatch;
    }

    if (controllerConfig.dpad) {
      list.push(
        <div key='dpad-header' className='controller-config-subheader'>{isDpadSameAsLeftStick ? 'Dpad / Left Stick' : 'Dpad'}</div>
      );
      const inner = [];
      for (const button of controllerConfig.dpad.dpadbutton) {
        inner.push(
          <div key={button.name} className='controller-config-button'>
            <div className='controller-config-button--input'>{button.name}:</div>
            <div className='controller-config-button--output'>{getFormattedMappedName(button.slots.slot, button.actionName)}</div>
          </div>
        );
      }
      list.push(
        <div key='dpad-subsection' className='controller-config-subsection'>
          {inner}
        </div>
      );
    }

    if (controllerConfig.button) {
      list.push(
        <div key='buttons-header' className='controller-config-subheader'>Buttons</div>
      );
      const inner = [];
      for (const button of controllerConfig.button) {
        inner.push(
          <div key={button.name} className='controller-config-button'>
            <div className='controller-config-button--input'>{button.name}:</div>
            <div className='controller-config-button--output'>{getFormattedMappedName(button.slots.slot, button.actionName)}</div>
          </div>
        );
      }
      list.push(
        <div key='buttons-subsection' className='controller-config-subsection'>
          {inner}
        </div>
      );
    }

    if (!isDpadSameAsLeftStick && leftStick) {
      let isMouseMovement = true;
      for (const button of leftStick.stickbutton) {
        if (button.slots.slot.mode !== 'mousemovement') {
          isMouseMovement = false;
          break;
        }
      }

      list.push(
        <div key='left-stick-header' className='controller-config-subheader'>{leftStick.name}</div>
      );
      const inner = [];
      // If all inputs are mouse movements, display a simpler input
      if (isMouseMovement) {
        inner.push(
          <div className='controller-config-button'>
            <div className='controller-config-button--input'>All Directions:</div>
            <div className='controller-config-button--output'>Mouse Movement</div>
          </div>
        );
      } else {
        for (const button of leftStick.stickbutton) {
          inner.push(
            <div key={button.uq_index} className='controller-config-button'>
              <div className='controller-config-button--input'>{button.name}:</div>
              <div className='controller-config-button--output'>{getFormattedMappedName(button.slots.slot, button.actionName)}</div>
            </div>
          );
        }
      }
      list.push(
        <div className='controller-config-subsection'>
          {inner}
        </div>
      );
    }

    if (rightStick) {
      let isMouseMovement = true;
      for (const button of rightStick.stickbutton) {
        if (button.slots.slot.mode !== 'mousemovement') {
          isMouseMovement = false;
          break;
        }
      }

      list.push(
        <div className='controller-config-subheader'>{rightStick.name}</div>
      );
      const inner = [];
      // If all inputs are mouse movements, display a simpler input
      if (isMouseMovement) {
        inner.push(
          <div className='controller-config-button'>
            <div className='controller-config-button--input'>All Directions:</div>
            <div className='controller-config-button--output'>Mouse Movement</div>
          </div>
        );
      } else {
        for (const button of rightStick.stickbutton) {
          inner.push(
            <div key={button.uq_index} className='controller-config-button'>
              <div className='controller-config-button--input'>{button.name}:</div>
              <div className='controller-config-button--output'>{getFormattedMappedName(button.slots.slot, button.actionName)}</div>
            </div>
          );
        }
      }
      list.push(
        <div className='controller-config-subsection'>
          {inner}
        </div>
      );
    }

    if (controllerConfig.trigger) {
      for (const trigger of controllerConfig.trigger) {
        list.push(
          <div className='controller-config-subheader'>{trigger.name}</div>
        );
        list.push(
          <div className='controller-config-subsection'>
            <div key={trigger.uq_index} className='controller-config-button'>
              <div className='controller-config-button--input'>{trigger.triggerbutton.name}:</div>
              <div className='controller-config-button--output'>{getFormattedMappedName(trigger.triggerbutton.slots.slot, trigger.triggerbutton.actionName)}</div>
            </div>
          </div>
        );
      }
    }

    return list;
  }, [controllerConfig]);

  if (controllerConfig) {
    return (
      <div className='browse-right-sidebar__row'>
        <p>Controller Configuration: </p>
        <div className='controller-config-inner'>
          {mappedTable}
        </div>
      </div>
    );
  } else {
    return <></>;
  }
}
