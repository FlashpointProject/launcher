import { FpfssUser } from '@shared/back/types';
import { DialogState, DialogStateTemplate } from 'flashpoint-launcher';
import { createNewDialog } from './dialog';
import { cancelDialog } from './store/main/slice';
import { AppDispatch } from './store/store';
import { axios, openUrlInWindow } from './Util';

export async function fpfssLogin(dispatch: AppDispatch, fpfssBaseUrl: string): Promise<FpfssUser> {
  // Get device auth token from FPFSS
  const tokenUrl = `${fpfssBaseUrl}/auth/device`;
  const data = {
    'client_id': 'flashpoint-launcher',
    'scope': 'identity game:read game:edit submission:read submission:read-files index:read',
  };
  const formData = new URLSearchParams(data).toString();
  const res = await axios.post(tokenUrl, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });
  const token = {
    'device_code': res.data['device_code'],
    'user_code': res.data['user_code'],
    'verification_uri': res.data['verification_uri'],
    'verification_uri_complete': res.data['verification_uri_complete'],
    'expires_in': res.data['verification_uri'],
    'interval': res.data['interval']
  };

  const pollUrl = `${fpfssBaseUrl}/auth/token`;
  const profileUrl = `${fpfssBaseUrl}/api/profile`;
  openUrlInWindow(token.verification_uri_complete);
  navigator.clipboard.writeText(token.verification_uri_complete);

  const dialog: DialogStateTemplate = {
    largeMessage: true,
    message: 'Please login in your browser to continue. If the link does not automatically open in your browser, paste it from your clipboard.',
    buttons: ['Cancel'],
  };

  const dialogId = createNewDialog(dispatch, dialog);

  // Start loop until an end state occurs
  return new Promise<FpfssUser>((resolve, reject) => {
    const pollData = {
      'device_code': token.device_code,
      'client_id': 'flashpoint-launcher',
      'grant_type': 'urn:ietf:params:oauth:grant-type:device_code'
    };
    const formData = new URLSearchParams(pollData).toString();
    const interval = setInterval(async () => {
      // Poll server for flow state
      await axios.post(pollUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })
      .then(async (res) => {
        if (res.data['access_token']) {
          // Found token, fetch profile info
          return axios.get(profileUrl, { headers: {
            'Authorization': `Bearer ${res.data['access_token']}`
          } })
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
            reject('Failed to fetch profile info - ' + err);
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
              reject('Access Denied');
              break;
            case 'expired_token':
              clearInterval(interval);
              reject('Expired Token');
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
    // Listen for dialog response
    window.Shared.dialogResEvent.once(dialogId, (d: DialogState, res: number) => {
      clearInterval(interval);
      reject('User Cancelled');
    });
  })
  .finally(() => {
    dispatch(cancelDialog(dialogId));
  });
}

/**
 *
 * @param extId The extension ID
 * @returns The consent status for the extension
 */

export function getFpfssConsentExt(extId: string): boolean | undefined {
  const consentData = localStorage.getItem('fpfss:extension_consent');
  if (!consentData) {
    return undefined;
  }

  try {
    const consentMap = consentData ? JSON.parse(consentData) : {};
    return consentMap[extId];
  } catch (error) {
    console.error('Failed to parse consent data:', error);
    return undefined;
  }
}

/**
*
* @param extId The extension ID
* @param status The consent status
*/
export function saveFpfssConsentExt(extId: string, status: boolean): void {
  try {
    const consentData = localStorage.getItem('fpfss:extension_consent');
    const consentMap = consentData ? JSON.parse(consentData) : {};
    consentMap[extId] = status;
    localStorage.setItem('fpfss:extension_consent', JSON.stringify(consentMap));
  } catch (error) {
    console.error('Failed to parse or save consent data:', error);
  }
}

/**
 * @param extId The extension ID
 */
export function clearFpfssConsentExt(extId: string): void {
  const consentData = localStorage.getItem('fpfss:extension_consent');
  if (!consentData) { return; }

  try {
    const consentMap = JSON.parse(consentData);
    delete consentMap[extId];
    localStorage.setItem('fpfss:extension_consent', JSON.stringify(consentMap));
  } catch (error) {
    console.error('Failed to parse consent data:', error);
  }
}

// async function doFpfssAuth(dispatch: AppDispatch): Promise<FpfssUser | null> {
//   const user = await fpfssLogin(this.props.mainActions.createDialog, this.props.mainActions.cancelDialog, this.props.preferencesData.fpfssBaseUrl)
//   .catch((err) => {
//     if (err !== 'User Cancelled') {
//       alert(err);
//     }
//   }) as FpfssUser | null; // Weird void from inferred typing?
//   if (user) {
//     // Store in fpfss state
//     dispatch(setUser(user));
//     // Store in localstorage
//     const userBase64 = Buffer.from(JSON.stringify(user, null, 0)).toString('base64');
//     localStorage.setItem('fpfss_user', userBase64);
//   }
//   return user;
// }
