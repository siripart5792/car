import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Flag and active promise to prevent race conditions and pending promise assertions
let activeSignInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;
const TOKEN_STORAGE_KEY = 'fleet_google_access_token_v2';
const TOKEN_SAVED_TIME_KEY = 'fleet_google_token_saved_time_v2';

// Cache the access token in memory and local storage.
let cachedAccessToken: string | null = null;

export const getStoredAccessToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedTime = localStorage.getItem(TOKEN_SAVED_TIME_KEY);
    if (!token) return null;
    // Google OAuth access tokens usually expire in 3600 seconds (1 hour).
    // If older than 55 minutes, consider it expired
    if (savedTime && Date.now() - Number(savedTime) > 55 * 60 * 1000) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_SAVED_TIME_KEY);
      return null;
    }
    return token;
  } catch (e) {
    return null;
  }
};

export const saveStoredAccessToken = (token: string): void => {
  cachedAccessToken = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_SAVED_TIME_KEY, String(Date.now()));
  } catch (e) {
    console.warn('Could not persist access token:', e);
  }
};

export const clearStoredAccessToken = (): void => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_SAVED_TIME_KEY);
  } catch (e) {
    // ignore
  }
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || getStoredAccessToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearStoredAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('ไม่สามารถรับ Access Token จากบัญชี Google ได้');
      }

      saveStoredAccessToken(credential.accessToken);
      return { user: result.user, accessToken: credential.accessToken };
    } catch (error: any) {
      if (
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-closed-by-user' ||
        (typeof error?.message === 'string' && error.message.includes('cancelled-popup-request'))
      ) {
        console.warn('Google sign-in popup was closed or cancelled by user.');
        return null;
      }
      if (error?.code === 'auth/popup-blocked') {
        console.warn('Google sign-in popup was blocked by browser in iframe environment.');
        throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณากดอนุญาตป๊อปอัป (Allow Popups) ในแถบเบราว์เซอร์');
      }
      if (typeof error?.message === 'string' && error.message.includes('Pending promise was never set')) {
        console.warn('Suppressed internal assertion in Firebase Auth.');
        return null;
      }
      console.warn('Google sign-in exception:', error?.message || error);
      throw error;
    } finally {
      setTimeout(() => {
        activeSignInPromise = null;
      }, 500);
    }
  })();

  return activeSignInPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getStoredAccessToken();
};

export const logout = async () => {
  await signOut(auth);
  clearStoredAccessToken();
};
