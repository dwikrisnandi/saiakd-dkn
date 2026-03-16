import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [nidn_nim, setNidnNim] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const u = await login(nidn_nim, password);
      // Route based on role
      if (u.role === 'admin') navigate('/admin');
      else if (u.role === 'dosen') navigate('/dosen');
      else if (u.role === 'mahasiswa') navigate('/mahasiswa');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow p-4" style={{ width: '400px', borderRadius: '15px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">SIAKAD DKN</h2>
          <p className="text-muted">STMIK Pamitran</p>
        </div>
        
        {error && <div className="alert alert-danger py-2">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">NIM / NIDN</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Masukkan NIM atau NIDN" 
              value={nidn_nim}
              onChange={(e) => setNidnNim(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Masukkan password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2 fw-bold" 
            disabled={loading}
          >
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>


      </div>
    </div>
  );
}
