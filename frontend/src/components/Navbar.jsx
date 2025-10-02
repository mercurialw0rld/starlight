import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import starlightCharacter from '../assets/starlight_character.png';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src={starlightCharacter} alt="Starlight" className="navbar-avatar" />
          Starlight
        </Link>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <Link to="/upload" className="navbar-link">
                Upload
              </Link>
              <Link to="/documents" className="navbar-link">
                Documents
              </Link>
              <Link to="/chat" className="navbar-link">
                Chat
              </Link>
              <div className="navbar-user">
                <span className="user-email">{user?.email}</span>
                <button onClick={logout} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
