import { ORIGIN, USER_PATH } from '../globals';
import { getCurrentAccessTokenOrRefresh } from '../utils/oauth';
import { getFromCacheOrFetch } from '../utils/networking';

function oauthUpdateToken(token) {
  return {
    type: 'OAUTH_UPDATE_TOKEN',
    token,
  };
}

function receiveOauthRedirectError(errorMessage) {
  return {
    type: 'RECEIVE_OAUTH_REDIRECT_ERROR',
    errorMessage,
  };
}

function oauthUserSucess(user) {
  return {
    type: 'OAUTH_USER_SUCCESS',
    user,
  };
}

function oauthLogout() {
  return {
    type: 'OAUTH_LOGOUT',
  };
}

function getUserInformation() {
  return (dispatch, getState) => {
    getCurrentAccessTokenOrRefresh(dispatch, getState)
      .then(accessToken => {
        return getFromCacheOrFetch(`${ORIGIN}/${USER_PATH}`, {
          Authorization: `Bearer ${accessToken}`,
        });
      })
      .then(data => dispatch(oauthUserSucess(data)))
      .catch(error => console.log(error));
  };
}

export {
  oauthUpdateToken,
  receiveOauthRedirectError,
  getUserInformation,
  oauthLogout,
};