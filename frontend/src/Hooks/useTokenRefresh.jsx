// useTokenRefresh.js
import { useEffect, useRef, useCallback } from 'react';
import { refreshAuthToken } from '../api';

const useTokenRefresh = () => {
  const intervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  const checkAndRefreshToken = useCallback(async () => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshingRef.current) {
      console.log('Token refresh already in progress');
      return;
    }

    try {
      const userInfo = JSON.parse(localStorage.getItem('user-info') || '{}');
      if (!userInfo.token) {
        console.log('No token found in user info');
        return;
      }

      // Decode JWT to check expiry (without verification for client-side check)
      const tokenParts = userInfo.token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        return;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;

      // Refresh if token expires in less than 5 minutes (300 seconds)
      if (timeUntilExpiry <= 300) {
        console.log('Token expiring soon, attempting refresh...');
        isRefreshingRef.current = true;

        const refreshResult = await refreshAuthToken(userInfo.token);
        if (refreshResult.requiresReauth) {
          console.log('Refresh failed, clearing user data and redirecting to login');
          localStorage.removeItem('user-info');
          window.location.href = '/login';
          return;
        }

        if (refreshResult.refreshed) {
          console.log('Token successfully refreshed');
          const updatedUserInfo = { ...userInfo, token: refreshResult.token };
          localStorage.setItem('user-info', JSON.stringify(updatedUserInfo));
        }
      }
    } catch (error) {
      console.error('Error in token refresh check:', error);
      // If refresh fails with auth error, clear storage and redirect
      if (error.response?.status === 401 || error.response?.data?.requiresReauth) {
        localStorage.removeItem('user-info');
        window.location.href = '/login';
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkAndRefreshToken();

    // Set up interval to check every 4 minutes (240 seconds)
    intervalRef.current = setInterval(checkAndRefreshToken, 4 * 60 * 1000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAndRefreshToken]);

  // Also check when user becomes active (optional enhancement)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab, check tokens
        checkAndRefreshToken();
      }
    };

    const handleFocus = () => {
      // User focused on window, check tokens
      checkAndRefreshToken();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkAndRefreshToken]);
};

export default useTokenRefresh;
