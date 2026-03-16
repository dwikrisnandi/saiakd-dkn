import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Menu, FileText, KeyRound } from 'lucide-react';
import api from '../utils/api';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({ count: 0, items: [] });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'mahasiswa' || user.role === 'dosen')) {
      const fetchNotifs = async () => {
        try {
          const res = await api.get('/notifications');
          setNotifications(res.data);
        } catch (err) {
          console.error("Failed fetching notifications", err);
        }
      };
      fetchNotifs();
      // Optional: Polling every 60s
      const interval = setInterval(fetchNotifs, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleNotifClick = (e) => {
    e.preventDefault();
    setDropdownOpen(false);
    if (user.role === 'mahasiswa') {
      navigate('/mahasiswa/assignments');
    } else if (user.role === 'dosen') {
      navigate('/dosen/assignments');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    
    if (passForm.new_password !== passForm.confirm_password) {
      return setPassError('Password baru dan konfirmasi tidak cocok');
    }
    if (passForm.new_password.length < 5) {
      return setPassError('Password baru minimal 5 karakter');
    }
    
    setIsSubmittingPass(true);
    try {
      const res = await api.put('/auth/change-password', {
        old_password: passForm.old_password,
        new_password: passForm.new_password
      });
      setPassSuccess(res.data.message || 'Password berhasil diubah');
      setPassForm({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setPassError(err.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setIsSubmittingPass(false);
    }
  };

  return (
    <nav className="main-header navbar navbar-expand navbar-white navbar-light">
      {/* Left navbar links */}
      <ul className="navbar-nav">
        <li className="nav-item">
          <a className="nav-link" data-widget="pushmenu" href="#" role="button">
            <Menu size={20} />
          </a>
        </li>
      </ul>

      {/* Right navbar links */}
      <ul className="navbar-nav ml-auto d-flex align-items-center">
        
        {/* Notifications Dropdown Menu */}
        {(user?.role === 'mahasiswa' || user?.role === 'dosen') && (
          <li className="nav-item dropdown me-3">
            <a 
              className="nav-link position-relative cursor-pointer" 
              onClick={(e) => { e.preventDefault(); setDropdownOpen(!dropdownOpen); }}
              href="#"
            >
              <Bell size={20} />
              {notifications.count > 0 && (
                <span className="badge badge-danger navbar-badge" style={{ top: '5px', right: '5px' }}>
                  {notifications.count}
                </span>
              )}
            </a>
            
            <div className={`dropdown-menu dropdown-menu-lg dropdown-menu-right ${dropdownOpen ? 'show' : ''}`} style={{ minWidth: '300px' }}>
              <span className="dropdown-item dropdown-header border-bottom">
                {notifications.count} Notifikasi Baru
              </span>
              
              {notifications.items.length === 0 ? (
                <div className="dropdown-item text-center text-muted py-3">
                  Tidak ada notifikasi baru.
                </div>
              ) : (
                notifications.items.map((n, i) => (
                  <React.Fragment key={n.id || i}>
                    <a href="#" className="dropdown-item text-wrap" style={{ whiteSpace: 'normal' }} onClick={handleNotifClick}>
                      <div className="d-flex align-items-start gap-2">
                        <FileText size={18} className="text-primary mt-1" />
                        <div>
                          <p className="mb-0 fw-bold small text-dark">{n.course_name}</p>
                          <p className="mb-0 text-muted small">{user.role === 'mahasiswa' ? `Tugas: ${n.title} (Belum kumpul)` : `${n.mahasiswa_name} mengumpulkan ${n.title}`}</p>
                          {user.role === 'dosen' && (
                             <small className="text-muted" style={{fontSize: '10px'}}>{new Date(n.submitted_at).toLocaleString('id-ID')}</small>
                          )}
                        </div>
                      </div>
                    </a>
                    <div className="dropdown-divider"></div>
                  </React.Fragment>
                ))
              )}
              <a href="#" className="dropdown-item dropdown-footer text-center" onClick={handleNotifClick}>
                Lihat Semua Tugas
              </a>
            </div>
          </li>
        )}
        
        {/* User Profile Dropdown Menu */}
        <li className="nav-item dropdown me-2">
          <a className="nav-link d-flex align-items-center" data-toggle="dropdown" href="#" style={{ cursor: 'pointer' }}>
            <div className="d-flex flex-column text-right d-none d-md-flex mr-2" style={{ lineHeight: '1.2' }}>
              <span className="font-weight-bold text-dark">{user?.name}</span>
              <span className="text-muted small text-capitalize">{user?.role}</span>
            </div>
            <div 
              className="bg-primary text-white d-flex align-items-center justify-content-center rounded-circle font-weight-bold"
              style={{ width: '35px', height: '35px' }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </a>
          <div className="dropdown-menu dropdown-menu-lg dropdown-menu-right mt-2">
            <span className="dropdown-item dropdown-header">{user?.name} ({user?.role})</span>
            <div className="dropdown-divider"></div>
            <a href="#" className="dropdown-item text-dark d-flex align-items-center py-2" onClick={(e) => { e.preventDefault(); setShowPasswordModal(true); setDropdownOpen(false); }}>
              <KeyRound size={16} className="mr-2 text-primary" /> Ganti Password
            </a>
            <div className="dropdown-divider"></div>
            <a href="#" className="dropdown-item text-danger d-flex align-items-center py-2" onClick={handleLogout}>
              <LogOut size={16} className="mr-2" /> Keluar
            </a>
          </div>
        </li>
      </ul>
      
      {/* Click outside to close dropdown (simple overlay logic) */}
      {dropdownOpen && (
        <div 
          className="position-fixed w-100 h-100" 
          style={{ top: 0, left: 0, zIndex: 1000 }} 
          onClick={() => setDropdownOpen(false)}
        ></div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Ganti Password</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
                </div>
                <div className="modal-body">
                  {passError && <div className="alert alert-danger py-2">{passError}</div>}
                  {passSuccess && <div className="alert alert-success py-2">{passSuccess}</div>}
                  
                  <form onSubmit={handleChangePassword}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Password Lama</label>
                      <input type="password" className="form-control" required
                             value={passForm.old_password} 
                             onChange={e => setPassForm({...passForm, old_password: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Password Baru</label>
                      <input type="password" className="form-control" required
                             value={passForm.new_password} 
                             onChange={e => setPassForm({...passForm, new_password: e.target.value})} />
                    </div>
                    <div className="mb-4">
                      <label className="form-label text-muted small fw-bold">Konfirmasi Password Baru</label>
                      <input type="password" className="form-control" required
                             value={passForm.confirm_password} 
                             onChange={e => setPassForm({...passForm, confirm_password: e.target.value})} />
                    </div>
                    
                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-light" onClick={() => setShowPasswordModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4" disabled={isSubmittingPass}>
                        {isSubmittingPass ? 'Menyimpan...' : 'Simpan Password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
