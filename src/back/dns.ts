import _axios from 'axios';

export const axios = _axios.create({
  headers: {
    'User-Agent': 'Flashpoint Launcher'
  }
});
