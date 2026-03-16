import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, BookOpen, Users, UserSquare2, Calendar, 
  FileText, CheckSquare, PenTool, LayoutGrid, Award
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();

  const getRoleLinks = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { name: 'Dashboard Admin', path: '/admin', icon: <Home size={18} className="nav-icon" /> },
          { name: 'Data Matakuliah', path: '/admin/courses', icon: <BookOpen size={18} className="nav-icon" /> },
          { name: 'Data Kelas', path: '/admin/classes', icon: <LayoutGrid size={18} className="nav-icon" /> },
          { name: 'Data Dosen', path: '/admin/dosen', icon: <UserSquare2 size={18} className="nav-icon" /> },
          { name: 'Data Mahasiswa', path: '/admin/mahasiswa', icon: <Users size={18} className="nav-icon" /> },
          { name: 'Penjadwalan', path: '/admin/schedules', icon: <Calendar size={18} className="nav-icon" /> },
        ];
      case 'dosen':
        return [
          { name: 'Dashboard Dosen', path: '/dosen', icon: <Home size={18} className="nav-icon" /> },
          { name: 'RPS Perkuliahan', path: '/dosen/rps', icon: <BookOpen size={18} className="nav-icon" /> },
          { name: 'Input Kehadiran', path: '/dosen/attendance', icon: <CheckSquare size={18} className="nav-icon" /> },
          { name: 'Upload Materi', path: '/dosen/materials', icon: <FileText size={18} className="nav-icon" /> },
          { name: 'Kelola Tugas', path: '/dosen/assignments', icon: <PenTool size={18} className="nav-icon" /> },
          { name: 'Input Nilai', path: '/dosen/grades', icon: <Award size={18} className="nav-icon" /> },
        ];
      case 'mahasiswa':
        return [
          { name: 'Dashboard Mahasiswa', path: '/mahasiswa', icon: <Home size={18} className="nav-icon" /> },
          { name: 'RPS Perkuliahan', path: '/mahasiswa/rps', icon: <BookOpen size={18} className="nav-icon" /> },
          { name: 'Materi Kuliah', path: '/mahasiswa/materials', icon: <FileText size={18} className="nav-icon" /> },
          { name: 'Tugas Kuliah', path: '/mahasiswa/assignments', icon: <PenTool size={18} className="nav-icon" /> },
          { name: 'Rekap Absensi', path: '/mahasiswa/attendance', icon: <CheckSquare size={18} className="nav-icon" /> },
          { name: 'Nilai KHS', path: '/mahasiswa/grades', icon: <Award size={18} className="nav-icon" /> },
        ];
      default:
        return [];
    }
  };

  const links = getRoleLinks();

  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4 position-fixed" style={{ height: '100vh', overflowY: 'auto' }}>
      {/* Brand Logo */}
      <a href="#" className="brand-link text-decoration-none d-flex align-items-center">
        <div className="bg-primary rounded d-flex align-items-center justify-content-center brand-image img-circle elevation-3" 
             style={{ width: '33px', height: '33px', opacity: '.8' }}>
          <span className="font-weight-bold text-white fs-6">S</span>
        </div>
        <span className="brand-text font-weight-light">SIAKAD DKN</span>
      </a>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Sidebar user panel (optional) */}
        <div className="user-panel mt-3 pb-3 mb-3 d-flex align-items-center">
          <div className="image">
            <div className="bg-secondary text-white d-flex align-items-center justify-content-center rounded-circle img-circle elevation-2"
                 style={{ width: '34px', height: '34px', fontSize: '14px' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="info">
            <a href="#" className="d-block text-decoration-none text-capitalize">{user?.role}</a>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="mt-2" style={{ paddingBottom: '60px' }}>
          <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
            <li className="nav-header text-uppercase text-secondary text-xs font-weight-bold mb-1">MENU UTAMA</li>
            
            {links.map((link, idx) => (
              <li className="nav-item mb-1" key={idx}>
                <NavLink 
                  to={link.path} 
                  end
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  {link.icon}
                  <p>
                    {link.name}
                  </p>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
