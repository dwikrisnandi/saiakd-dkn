import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, AlertCircle, Award, Clock } from 'lucide-react';

export default function MahasiswaDashboard() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState({ activeTasks: 0, ipk: '0.00' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch all schedules
        const resSched = await api.get('/schedules');
        // As a prototype, assuming the student is enrolled in all fetched schedules
        // In a real app we would strictly filter by resSched.data matching `enrollments` table
        setSchedules(resSched.data);

        let uncompletedTasks = 0;
        let totalScore = 0;
        let scoreCount = 0;

        const scheduleIds = resSched.data.map(s => s.id);
        
        if (scheduleIds.length > 0) {
           // Fetch assignments for these schedules
           const assignmentsPromises = scheduleIds.map(id => api.get(`/assignments/${id}`));
           const assignmentsRes = await Promise.all(assignmentsPromises);
           
           // Fetch submissions for this user to know what is completed
           // (We don't have a single /my-submissions endpoint, so we approximate or just use the notification polling logic)
           // Let's call /notifications to see the EXACT number of unfinished tasks directly!
           try {
             const notifRes = await api.get('/notifications');
             uncompletedTasks = notifRes.data.count || 0;
           } catch(e) {}

           // Fetch Grades for these schedules
           const gradesPromises = scheduleIds.map(id => api.get(`/grades/${id}`));
           const gradesRes = await Promise.all(gradesPromises);
           
           gradesRes.forEach(res => {
              // find the current student in the grade list
              const myGrade = res.data.find(g => g.mahasiswa_id === user.id);
              if (myGrade && myGrade.final_score > 0) {
                 // Convert 0-100 score to 0.0-4.0 scale roughly
                 let scale4 = (myGrade.final_score / 100) * 4;
                 totalScore += scale4;
                 scoreCount++;
              }
           });
        }

        let calculatedIpk = '0.00';
        if (scoreCount > 0) {
           calculatedIpk = (totalScore / scoreCount).toFixed(2);
        }

        setStats({
          activeTasks: uncompletedTasks,
          ipk: calculatedIpk
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user.id]);

  const cards = [
    { title: 'Matakuliah Terdaftar', value: schedules.length, icon: <BookOpen size={28} className="text-primary"/>, bg: 'bg-primary-subtle' },
    { title: 'Tugas Belum Selesai', value: stats.activeTasks, icon: <AlertCircle size={28} className="text-danger"/>, bg: 'bg-danger-subtle' },
    { title: 'IPK Sementara', value: stats.ipk, icon: <Award size={28} className="text-success"/>, bg: 'bg-success-subtle' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Selamat datang, {user?.name}</h3>
        <p className="text-muted">NIM: {user?.nidn_nim}</p>
      </div>
      
      <div className="row g-4 mb-4">
        {cards.map((card, idx) => (
          <div className="col-12 col-md-4" key={idx}>
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

      <h5 className="fw-bold mb-3 mt-5">Jadwal Kuliah Anda</h5>
      <div className="row g-3">
        {loading ? (
          <div className="col-12 text-center text-muted">Memuat jadwal...</div>
        ) : schedules.length === 0 ? (
          <div className="col-12 text-center text-muted">Anda belum memiliki jadwal kuliah.</div>
        ) : (
          schedules.map((s, idx) => (
            <div className="col-md-6 col-lg-4" key={idx}>
              <div className="card shadow-sm border-0 h-100 rounded-4">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <span className="badge bg-primary-subtle text-primary border">{s.class_name}</span>
                    <span className="text-muted small fw-semibold"><Clock size={14} className="me-1 mb-1"/>{s.day}, {s.time_start} - {s.time_end}</span>
                  </div>
                  <h5 className="fw-bold mb-1">{s.course_name} <span className="text-muted fs-6">({s.course_code})</span></h5>
                  <p className="text-muted small mb-2">Dosen: {s.dosen_name}</p>
                  <p className="text-muted small mb-0">Ruang: {s.room || 'TBA'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
