import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, ArrowLeft } from 'lucide-react';

export default function MahasiswaKehadiran() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await api.get('/schedules');
        setSchedules(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchedules();
  }, []);

  // Fetch actual attendance from DB
  useEffect(() => {
    if (!selectedSchedule) return;
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/attendance/${selectedSchedule.id}`);
        const mine = res.data
           .filter(a => a.mahasiswa_id === user.id)
           .map(a => ({
             pertemuan: a.meeting_number,
             tanggal: a.date,
             status: a.status
           }));
        setAttendance(mine.sort((a,b) => a.pertemuan - b.pertemuan));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedSchedule, user.id]);

  const getStatusStyle = (status) => {
    if (status === 'Hadir' || status === 'hadir') return { color: 'success', label: 'Hadir', emoji: '✅' };
    if (status === 'Izin/Sakit' || status === 'Izin' || status === 'Sakit' || status === 'izin' || status === 'sakit') return { color: 'warning', label: 'Izin/Sakit', emoji: '🟡' };
    return { color: 'danger', label: 'Alpa', emoji: '❌' };
  };

  const hadir = attendance.filter(a => a.status === 'Hadir' || a.status === 'hadir').length;
  const persen = attendance.length > 0 ? Math.round((hadir / attendance.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedSchedule && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedSchedule(null); setAttendance([]); }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h3 className="fw-bold mb-0">Rekap Kehadiran</h3>
          {selectedSchedule && <small className="text-muted">{selectedSchedule.course_name} — {selectedSchedule.class_name}</small>}
        </div>
      </div>

      {!selectedSchedule ? (
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk melihat rekap kehadiran:</p>
          <div className="row g-3">
            {schedules.map(s => (
              <div className="col-md-6 col-lg-4" key={s.id}>
                <div
                  className="card shadow-sm border-0 rounded-4 h-100"
                  style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => setSelectedSchedule(s)}
                >
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-info-subtle p-3 rounded-3 me-3">
                        <CheckSquare size={22} className="text-info" />
                      </div>
                      <span className="badge bg-info-subtle text-info border border-info-subtle">{s.course_code}</span>
                    </div>
                    <h5 className="fw-bold mb-1">{s.course_name}</h5>
                    <p className="text-muted small mb-2">{s.class_name}</p>
                    <div className="d-flex gap-2 text-muted" style={{fontSize:'12px'}}>
                      <span>🎓 {s.dosen_name}</span>
                      <span>•</span>
                      <span>📅 {s.day}</span>
                    </div>
                  </div>
                  <div className="card-footer bg-info-subtle border-0 text-center rounded-bottom-4 py-2">
                    <small className="fw-bold text-info">Klik untuk lihat kehadiran →</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Summary Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="fw-bold mb-1">Statistik Kehadiran</h5>
                  <p className="text-muted small mb-0">{attendance.length} total pertemuan tercatat</p>
                </div>
                <div className="col-auto text-end">
                  <div className={`display-6 fw-bold text-${persen >= 75 ? 'success' : 'danger'}`}>{persen}%</div>
                  <small className="text-muted">{hadir}/{attendance.length} pertemuan hadir</small>
                </div>
              </div>
              <div className="progress mt-3 rounded-pill" style={{height: '10px'}}>
                <div
                  className={`progress-bar bg-${persen >= 75 ? 'success' : 'danger'} rounded-pill`}
                  style={{ width: `${persen}%` }}
                ></div>
              </div>
              {persen < 75 && <p className="text-danger small mb-0 mt-2">⚠️ Kehadiran di bawah 75%, harap perhatikan!</p>}
            </div>
          </div>

          {loading ? (
            <div className="text-center text-muted py-4">Memuat data...</div>
          ) : (
            <div className="card shadow-sm border-0 rounded-4">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4 py-3">Pertemuan</th>
                      <th className="py-3">Tanggal</th>
                      <th className="py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a, i) => {
                      const s = getStatusStyle(a.status);
                      return (
                        <tr key={i}>
                          <td className="ps-4 fw-bold">Pertemuan {a.pertemuan}</td>
                          <td className="text-muted">{new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          <td>
                            <span className={`badge bg-${s.color}-subtle text-${s.color} border border-${s.color}-subtle px-3 py-2`}>
                              {s.emoji} {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
