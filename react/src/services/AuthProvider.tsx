/**
 * Authentication Provider
 * Manages Clerk authentication token for API requests
 * This provider must wrap the entire application
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setAuthToken } from './api';

/**
 * AuthProvider Component
 * Wraps the app to provide authentication token to API service
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    // Function to update token
    const updateToken = async () => {
      try {
        const token = await getToken();
        setAuthToken(token);
        console.log('[AuthProvider] Token updated');
      } catch (error) {
        console.error('[AuthProvider] Failed to get token:', error);
        setAuthToken(null);
      }
    };

    // Get initial token
    updateToken();

    // Update token periodically (every 5 minutes)
    const interval = setInterval(updateToken, 5 * 60 * 1000);

    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, [getToken]);

  return <>{children}</>;
};

export default AuthProvider;
