export type ControllerSet = {
  stick?: ControllerStick[];
  trigger?: ControllerTrigger[];
  dpad?: ControllerDpad;
  button?: Button[];
}

export type ControllerStick = {
  stickbutton: Button[];
  name: string;
  uq_index: number;
}

type ControllerDpad = {
  dpadbutton: Button[];
  uq_index: number;
}

export type ControllerTrigger = {
  triggerbutton: Button;
  name: string;
  uq_index: number;
}

type Button = {
  slots: Slots;
  name: string;
  actionName?: string;
  uq_index: number;
};

type Slots = {
  slot: Slot;
}

export type Slot = {
  code: number;
  mode: string;
}

type MappedName = {
  output: string;
  name?: string;
}

export function getFormattedMappedName({ code, mode }: Slot, name?: string): string {
  const mappedName = getMappedName({ code, mode }, name);
  if (mappedName.name !== undefined) {
    return `${mappedName.name} - (${mappedName.output})`;
  } else {
    return mappedName.output;
  }
}

export function getMappedName({ code, mode }: Slot, name?: string): MappedName {
  // We can map all regular letters to ascii chars
  if (mode === 'keyboard' && code >= 65 && code <= 90) {
    return {
      output: String.fromCharCode(code),
      name,
    };
  }

  if (mode in readableOutputs) {
    const category = readableOutputs[mode];
    if (code in category) {
      return {
        output: category[code],
        name
      };
    }
  }
  return {
    output: `Unknown (${mode} - ${code})`,
    name
  };
}

export const readableInputs: any = {
  stick: {
    1: 'Left Stick',
    2: 'Right Stick'
  },
  stickbutton: {
    1: 'Up',
    3: 'Right',
    5: 'Down',
    7: 'Left'
  },
  trigger: {
    5: 'Left Trigger',
    6: 'Right Trigger'
  },
  triggerbutton: {
    2: 'Trigger Pull'
  },
  dpadbutton: {
    1: 'Up',
    2: 'Right',
    4: 'Down',
    8: 'Left',
  },
  button: {
    1: 'A',
    2: 'B',
    3: 'X',
    4: 'Y',
    5: 'Select',
    7: 'Start',
  }
};


const readableOutputs: any = {
  mousemovement: {
    1: 'Mouse Up',
    2: 'Mouse Down',
    3: 'Mouse Left',
    4: 'Mouse Right',
  },
  mousebutton: {
    1: 'Left Mouse Button',
    3: 'Right Mouse Button',
  },
  keyboard: {
    16777216: 'Escape',
    16777220: 'Enter',
    16777234: 'Arrow Left',
    16777235: 'Arrow Up',
    16777236: 'Arrow Right',
    16777237: 'Arrow Down',
  }
};
