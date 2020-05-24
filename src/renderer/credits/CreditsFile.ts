import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';
import { CreditsData, CreditsDataProfile, CreditsDataRole } from './types';

const { str } = Coerce;

export namespace CreditsFile {
  export function parseCreditsData(data: any, onError?: (error: string) => void): CreditsData {
    const parsed: CreditsData = {
      profiles: [],
      roles: []
    };
    const parser = new ObjectParser({
      input: data,
      onError: onError && (e => onError(`Error while parsing Credits: ${e.toString()}`))
    });
    parser.prop('profiles').array(item => parsed.profiles.push(parseProfile(item)));
    parser.prop('roles').array(item => parsed.roles.push(parseRole(item)));
    return parsed;
  }

  function parseRole(parser: IObjectParserProp<any>): CreditsDataRole {
    const parsed: CreditsDataRole = {
      name: '',
      color: '',
      description: '',
      noCategory: false
    };
    parser.prop('name',        v => parsed.name = str(v));
    parser.prop('color',       v => parsed.color  = str(v), true); // @TODO Validate Colors?
    parser.prop('description', v => parsed.description  = str(v), true);
    parser.prop('noCategory',  v => parsed.noCategory  = !!v, true);
    return parsed;
  }

  function parseProfile(parser: IObjectParserProp<any>): CreditsDataProfile {
    const parsed: CreditsDataProfile = {
      title: '',
      roles: [],
      note: undefined,
      icon: undefined
    };
    parser.prop('title', v => parsed.title = str(v));
    parser.prop('icon',  v => parsed.icon  = str(v), true);
    parser.prop('note',  v => parsed.note  = str(v), true);
    parser.prop('roles', true).arrayRaw(role => parsed.roles.push(str(role)));
    return parsed;
  }
}
