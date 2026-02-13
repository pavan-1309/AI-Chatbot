import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.REACT_APP_USER_POOL_ID,
  ClientId: process.env.REACT_APP_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

export const AuthService = {
  signUp: (email, password) => {
    return new Promise((resolve, reject) => {
      userPool.signUp(email, password, [], null, (err, result) => {
        if (err) reject(err);
        else resolve(result.user);
      });
    });
  },

  confirmSignUp: (email, code) => {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: email, Pool: userPool });
      user.confirmRegistration(code, true, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  signIn: (email, password) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    
    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: resolve,
        onFailure: reject
      });
    });
  },

  signOut: () => {
    const user = userPool.getCurrentUser();
    if (user) user.signOut();
  },

  getCurrentUser: () => {
    return new Promise((resolve, reject) => {
      const user = userPool.getCurrentUser();
      if (!user) return resolve(null);
      
      user.getSession((err, session) => {
        if (err) reject(err);
        else resolve(session.isValid() ? user : null);
      });
    });
  },

  getToken: () => {
    return new Promise((resolve, reject) => {
      const user = userPool.getCurrentUser();
      if (!user) return reject(new Error('No user'));
      
      user.getSession((err, session) => {
        if (err) reject(err);
        else resolve(session.getIdToken().getJwtToken());
      });
    });
  }
};
