import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users, BookOpen, UserSquare2, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    mahasiswa: 0,
    dosen: 0,
    courses: 0,
    schedules: 0
  });

  useEffect(() => {
    // Fetch quick stats from backend 
    const fetchStats = async () => {
      try {
        const [mhsRes, dosenRes, coursesRes, schedRes] = await Promise.all([
          api.get('/users?role=mahasiswa'),
          api.get('/users?role=dosen'),
          api.get('/courses'),
          api.get('/schedules')
        ]);
        
        setStats({
          mahasiswa: mhsRes.data.length,
          dosen: dosenRes.data.length,
          courses: coursesRes.data.length,
          schedules: schedRes.data.length
        });
      } catch (err) {
        console.error("Failed fetching admin stats", err);
      }
    };
    
    fetchStats();
  }, []);

  const cards = [
    { title: 'Total Mahasiswa', value: stats.mahasiswa, icon: <Users size={28} className="text-primary"/>, bg: 'bg-primary-subtle' },
    { title: 'Total Dosen', value: stats.dosen, icon: <UserSquare2 size={28} className="text-success"/>, bg: 'bg-success-subtle' },
    { title: 'Matakuliah Aktif', value: stats.courses, icon: <BookOpen size={28} className="text-warning"/>, bg: 'bg-warning-subtle' },
    { title: 'Jadwal Kuliah', value: stats.schedules, icon: <Calendar size={28} className="text-danger"/>, bg: 'bg-danger-subtle' },
  ];

  return (
    <div className="animate-fade-in">
      <h3 className="fw-bold mb-4">Dashboard Admin</h3>
      
      <div className="row g-4 mb-4">
        {cards.map((card, idx) => (
          <div className="col-12 col-md-6 col-lg-3" key={idx}>
            <div className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
              <div className="card-body p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 fw-semibold">{card.title}</p>
                  <h2 className="fw-bold mb-0 text-dark">{card.value}</h2>
                </div>
                <div className={`${card.bg} p-3 rounded-circle d-flex align-items-center justify-content-center`}>
                  {card.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
          <h5 className="fw-bold">Aktivitas Terbaru Sistem</h5>
        </div>
        <div className="card-body p-4">
          <p className="text-muted">Fitur log aktivitas akan segera hadir...</p>
        </div>
      </div>
    </div>
  );
}
