import { FpfssUser } from '@shared/back/types';
import axios from 'axios';
import * as remote from '@electron/remote';

export async function fpfssLogin(): Promise<FpfssUser | null> {
  const fpfssBaseUrl = window.Shared.preferences.data.fpfssBaseUrl;
  // Get device auth token from FPFSS
  const tokenUrl = `${fpfssBaseUrl}/auth/token`;
  const res = await axios.get(tokenUrl);
  const token = {
    'device_code': res.data['device_code'],
    'user_code': res.data['user_code'],
    'verification_uri': res.data['verification_uri'],
    'expires_in': res.data['verification_uri'],
    'interval': res.data['interval']
  };

  const verifyUrl = `${token.verification_uri}?code=${token.user_code}`;
  const pollUrl = `${fpfssBaseUrl}/auth/token?device_code=${token.device_code}`;
  const profileUrl = `${fpfssBaseUrl}/api/profile`;
  await remote.shell.openExternal(verifyUrl);

  // Start loop until an end state occurs
  return new Promise<FpfssUser | null>((resolve, reject) => {
    const interval = setInterval(async () => {
      // Poll server for flow state
      await axios.post(pollUrl)
      .then(async (res) => {
        if (res.data['access_token']) {
          // Found token, fetch profile info
          return axios.get(profileUrl, { headers: {
            'Authorization': `Bearer ${res.data['access_token']}`
          }})
          .then((profileRes) => {
            const user: FpfssUser = {
              username: profileRes.data['Username'],
              userId: profileRes.data['UserID'],
              avatarUrl: profileRes.data['AvatarURL'],
              roles: profileRes.data['Roles'],
              accessToken: res.data['access_token']
            };
            clearInterval(interval);
            resolve(user);
          })
          .catch((err) => {
            clearInterval(interval);
            reject('Failed to fetch profile info');
            return;
          });
        }
        if (res.data['error']) {
          switch (res.data['error']) {
            case 'authorization_pending':
              // Keep polling
              break;
            case 'access_denied':
              clearInterval(interval);
              resolve(null);
              break;
            case 'expired_token':
              clearInterval(interval);
              resolve(null);
              break;
          }
        }
      })
      .catch((err) => {
        console.log(err);
        clearInterval(interval);
        reject('Failed to contact FPFSS while polling');
      });
    }, token.interval * 1000);
  });
}
