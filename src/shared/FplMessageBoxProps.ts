export type FplMessageBoxPrompt = {
  key: string;
  query: string;
  type: 'number' | 'string';
  default?: any;
  locked?: boolean;
}

export type FplMessageBoxPropsExternal = {
  message: string;
  prompts?: FplMessageBoxPrompt[];
  buttons?: string[];
  cancelId?: number;
  notificationId: string;
}

export type FplMessageBoxProps = {
  message: string;
  prompts?: FplMessageBoxPrompt[];
  buttons?: string[];
  cancelId?: number;
  onConfirm: (value: number, promptStates?: FplMessageBoxPromptStates) => void;
}

export type FplMessageBoxPromptStates = Map<string, string>;
