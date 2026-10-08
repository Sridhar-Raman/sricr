import { createContext, useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import Modal from './Modal';

const LogoutContext = createContext(() => {});

/** Returns a function that opens the "Log out?" confirmation. Use it for every Log out button. */
export const useLogoutConfirm = () => useContext(LogoutContext);

/**
 * Renders the confirmation dialog once for the whole app. Nothing is signed out until the user confirms;
 * Esc, the backdrop, the close button and "Stay signed in" all leave the session untouched.
 */
export const LogoutConfirmProvider = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ask = useCallback(() => setOpen(true), []);
    const close = useCallback(() => setOpen(false), []);

    const confirm = () => {
        setOpen(false);
        logout();
        navigate('/', { replace: true });
    };

    return (<LogoutContext.Provider value={ask}>
      {children}
      {open && user && (<Modal title="Log out?" onClose={close} width={420}>
        <div className="stack">
          <p>You’re signed in as <strong>{user.name}</strong>. Do you want to log out of SRI.CR?</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={close}>Stay signed in</button>
            <button type="button" className="btn btn-danger" onClick={confirm} autoFocus><Icon name="log-out" size={16} />Log out</button>
          </div>
        </div>
      </Modal>)}
    </LogoutContext.Provider>);
};
