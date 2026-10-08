import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStore } from '../api/client';

const AuthContext = createContext(null);

/** Everyone lands in the same app shell after signing in or signing up; the menu inside adapts to the role. */
export const homeFor = () => '/app';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(!!tokenStore.get());
    // True after an explicit Log out, so guarded pages send you Home rather than to the login form.
    const [signedOut, setSignedOut] = useState(false);

    // Restore the session from the stored token.
    useEffect(() => {
        if (!tokenStore.get()) return;
        api.get('/auth/me')
            .then((response) => setUser(response.data.user))
            .catch(() => tokenStore.clear())
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        tokenStore.set(data.token);
        setSignedOut(false);
        setUser(data.user);
        return data.user;
    }, []);

    const signup = useCallback(async (details) => {
        const { data } = await api.post('/auth/signup', details);
        tokenStore.set(data.token);
        setSignedOut(false);
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(() => {
        tokenStore.clear();
        setSignedOut(true);
        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user, setUser, loading, signedOut, login, signup, logout,
        isAdmin: user?.role === 'admin', isClient: user?.role === 'client',
    }), [user, loading, signedOut, login, signup, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
