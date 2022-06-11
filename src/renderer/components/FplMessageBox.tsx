import * as React from 'react';
import { InputField, InputElement } from './InputField';
import { SimpleButton } from './SimpleButton';
import { FplMessageBoxProps, FplMessageBoxPromptStates } from '@shared/FplMessageBoxProps';

export function FplMessageBox(props: FplMessageBoxProps) {
  const { prompts, message, buttons } = props;
  const [promptStates, setPromptStates] = React.useState<FplMessageBoxPromptStates>(() => {
    const states: FplMessageBoxPromptStates = new Map<string, string>();
    if (prompts) {
      for (const p of prompts) {
        states.set(p.key, p.default || '');
      }
    }
    return states;
  });

  // App will reuse this component, make sure it updates prompts when it changes
  React.useEffect(() => {
    const states: FplMessageBoxPromptStates = new Map<string, string>();
    if (prompts) {
      for (const p of prompts) {
        states.set(p.key, p.default || '');
      }
    }
    setPromptStates(states);
  }, [props.prompts]);

  return React.useMemo(() => {
    const promptRenders = Array.from(promptStates.keys()).map((key, idx) => {
      const current = promptStates.get(key) || '';
      const propInfo = prompts.find(prompt => prompt.key === key);
      const onChange = (event: React.ChangeEvent<InputElement>) => {
        const newPromptStates = new Map(promptStates);
        newPromptStates.set(key, event.target.value);
        setPromptStates(newPromptStates);
      };
      return (
        <div className='message-box-prompt' key={idx}>
          <div className='message-box-query'>{propInfo.query}</div>
          <InputField
            editable={propInfo.locked ? false : true}
            text={current}
            onChange={onChange}
          />
        </div>
      );
    });

    const onButtonClick = (buttonId: number) => {
      if (props.onConfirm) {
        props.onConfirm(buttonId, promptStates);
      }
    };

    const buttonRenders = buttons ? buttons.map((b, idx) => {
      return (
        <SimpleButton
          key={idx}
          value={b}
          onClick={() => {
            onButtonClick(idx);
          }}
        />
      );
    }):
      <SimpleButton
        value={'OK'}
        onClick={() => {
          onButtonClick(0);
        }}/>;

    return (
      <div className='message-box'>
        <div className='message-box-message'>{message}</div>
        <div className='message-box-prompts'>
          {promptRenders}
        </div>
        <div className='message-box-buttons'>
          {buttonRenders}
        </div>
      </div>
    );
  }, [props, promptStates]);
}
