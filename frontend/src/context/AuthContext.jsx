import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AUTH_API } from '../api/axios';

const AuthContext = createContext(null);

function extractErrorMessage(err, defaultMsg = 'An error occurred') {
  if (!err) return defaultMsg;
  if (!err.response) {
    return 'Server error: Unable to connect to the server. Please check your network or server status.';
  }
  const data = err.response.data;
  if (!data) {
    if (err.response.status >= 500) {
      return 'Server error: An internal server error occurred. Please try again later.';
    }
    return err.message || defaultMsg;
  }

  // Handle FastAPI detail (can be string, array of error objects, or object)
  const detail = data.detail || data.message;
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === 'string') return item;
      const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
      const msg = item.msg || JSON.stringify(item);
      return field && field !== 'body' ? `${field}: ${msg}` : msg;
    });
    return messages.join('. ') || defaultMsg;
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (err.response.status >= 500) {
    return 'Server error: An internal server error occurred. Please try again later.';
  }
  return err.message || defaultMsg;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const response = await AUTH_API.login({ email, password });
      const { access_token, refresh_token, user: userData } = response.data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      return userData;
    } catch (err) {
      const message = extractErrorMessage(err, 'Login failed');
      let errorType = 'general';
      const status = err.response?.status;
      const lower = message.toLowerCase();

      if (!err.response || (status && status >= 500)) {
        errorType = 'server_error';
      } else if (status === 404 || lower.includes('user not found') || lower.includes('no account')) {
        errorType = 'user_not_found';
      } else if (
        status === 401 ||
        lower.includes('password') ||
        lower.includes('invalid email or password') ||
        lower.includes('invalid credentials')
      ) {
        errorType = 'password_incorrect';
      } else if (status === 422) {
        if (lower.includes('password')) {
          errorType = 'password_incorrect';
        } else if (lower.includes('email') || lower.includes('user')) {
          errorType = 'user_not_found';
        } else {
          errorType = 'validation_error';
        }
      } else {
        errorType = 'auth_error';
      }

      setError(message);
      const customErr = new Error(message);
      customErr.errorType = errorType;
      customErr.status = status;
      throw customErr;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await AUTH_API.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
      });
      const { access_token, refresh_token, user: newUser } = response.data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(newUser));

      setUser(newUser);
      return newUser;
    } catch (err) {
      const message = extractErrorMessage(err, 'Registration failed');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

