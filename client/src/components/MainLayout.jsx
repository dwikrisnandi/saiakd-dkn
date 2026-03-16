import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ allowedRoles }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // AdminLTE expects body to have specific classes for layout.
    // The classes are already in index.html, but we trigger layout
    // recalculation if needed or initialize plugins.
    if (window.$ && window.$.AdminLTE) {
      window.$('[data-widget="treeview"]').Treeview('init');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return (
    <div className="wrapper">
      <Topbar />
      <Sidebar />
      <div className="content-wrapper bg-light">
        <section className="content p-4">
          <div className="container-fluid">
            <Outlet />
          </div>
        </section>
      </div>
      <footer className="main-footer">
        <div className="float-right d-none d-sm-inline">
          Versi 1.0.0
        </div>
        <strong>Copyright &copy; 2024 <a href="#">SIAKAD DKN</a>.</strong> Hak cipta milik Dwi Krisnandi.
      </footer>
    </div>
  );
}
