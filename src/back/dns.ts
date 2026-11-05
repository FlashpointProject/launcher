import { VERSION } from '@shared/version';
import _axios from 'axios';

export const axios = _axios.create({
  headers: {
    'User-Agent': 'Flashpoint Launcher/' + VERSION,
    'x-launcher-version': VERSION
  }
});
