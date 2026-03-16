import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Award, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MahasiswaNilai() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myGrades, setMyGrades] = useState(null);

  const calculateFinal = (g) => Math.round((g.kehadiran * 0.1) + (g.tugas * 0.2) + (g.uts * 0.3) + (g.uas * 0.4));
  const getLetterGrade = (score) => {
    if (score >= 85) return { letter: 'A', mutu: 4.0, color: 'success' };
    if (score >= 75) return { letter: 'B', mutu: 3.0, color: 'primary' };
    if (score >= 65) return { letter: 'C', mutu: 2.0, color: 'warning' };
    if (score >= 55) return { letter: 'D', mutu: 1.0, color: 'danger' };
    return { letter: 'E', mutu: 0.0, color: 'dark' };
  };

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
  useEffect(() => {
    if (!selectedSchedule) {
      setMyGrades(null);
      return;
    }
    const fetchGrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/grades/${selectedSchedule.id}`);
        // Find my own grades
        const mine = res.data.find(g => g.mahasiswa_id === user.id);
        if (mine) {
          setMyGrades({
            kehadiran: mine.kehadiran || 0,
            tugas: mine.tugas || 0,
            uts: mine.uts || 0,
            uas: mine.uas || 0,
            final_score: mine.final_score || 0
          });
        } else {
          setMyGrades({ kehadiran: 0, tugas: 0, uts: 0, uas: 0, final_score: 0 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [selectedSchedule, user.id]);

  const finalScore = myGrades ? calculateFinal(myGrades) : 0;
  const letterGrade = getLetterGrade(finalScore);

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedSchedule && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedSchedule(null)}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h3 className="fw-bold mb-0">Nilai (KHS)</h3>
          {selectedSchedule && <small className="text-muted">{selectedSchedule.course_name} — {selectedSchedule.class_name}</small>}
        </div>
      </div>

      {!selectedSchedule ? (
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk melihat nilai:</p>
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
                      <div className="bg-warning-subtle p-3 rounded-3 me-3">
                        <Award size={22} className="text-warning" />
                      </div>
                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle">{s.course_code}</span>
                    </div>
                    <h5 className="fw-bold mb-1">{s.course_name}</h5>
                    <p className="text-muted small mb-2">{s.class_name}</p>
                    <div className="d-flex gap-2 text-muted" style={{fontSize:'12px'}}>
                      <span>🎓 {s.dosen_name}</span>
                      <span>•</span>
                      <span>{s.sks || 3} SKS</span>
                    </div>
                  </div>
                  <div className="card-footer bg-warning-subtle border-0 text-center rounded-bottom-4 py-2">
                    <small className="fw-bold text-warning">Klik untuk lihat nilai →</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Grade Summary Hero */}
          <div className={`card shadow-sm border-0 rounded-4 mb-4 border-top border-5 border-${letterGrade.color}`}>
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col">
                  <small className="text-muted fw-bold text-uppercase">Nilai Akhir</small>
                  <div className="display-4 fw-bold mt-1">{loading ? "..." : finalScore}</div>
                  {!loading && (
                    <div className={`text-${letterGrade.color} fw-bold`}>
                      Grade {letterGrade.letter} &bull; {letterGrade.mutu.toFixed(1)} Mutu
                    </div>
                  )}
                </div>
                <div className="col-auto">
                  <div className={`bg-${letterGrade.color} text-white rounded-circle d-flex align-items-center justify-content-center`}
                    style={{ width: '80px', height: '80px', fontSize: '2rem', fontWeight: 'bold' }}>
                    {loading ? "-" : letterGrade.letter}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grade Breakdown */}
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">Rincian Komponen Nilai</h5>
              {myGrades && myGrades.kehadiran === 0 && myGrades.tugas === 0 && myGrades.uts === 0 && myGrades.uas === 0 && (
                <p className="text-muted small mb-4">⚠️ Data nilai belum diinput oleh dosen.</p>
              )}
              {loading ? (
                <div className="text-center py-4 text-muted">Memuat data nilai...</div>
              ) : myGrades && [
                { label: 'Kehadiran', bobot: '10%', nilai: myGrades.kehadiran, color: 'info' },
                { label: 'Tugas', bobot: '20%', nilai: myGrades.tugas, color: 'primary' },
                { label: 'UTS (Ujian Tengah Semester)', bobot: '30%', nilai: myGrades.uts, color: 'warning' },
                { label: 'UAS (Ujian Akhir Semester)', bobot: '40%', nilai: myGrades.uas, color: 'success' },
              ].map((item, i) => (
                <div className="mb-4" key={i}>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">{item.label}</span>
                    <div className="d-flex gap-3">
                      <span className="text-muted small">Bobot: {item.bobot}</span>
                      <span className="fw-bold">{item.nilai}</span>
                    </div>
                  </div>
                  <div className="progress rounded-pill" style={{height: '8px'}}>
                    <div className={`progress-bar bg-${item.color} rounded-pill`} style={{ width: `${item.nilai}%` }}></div>
                  </div>
                </div>
              ))}
              <div className="border-top pt-3 d-flex justify-content-between align-items-center">
                <span className="fw-bold">Nilai Akhir (10%H + 20%T + 30%UTS + 40%UAS)</span>
                {loading ? <span className="text-muted">Memuat...</span> : (
                  <span className={`badge bg-${letterGrade.color} fs-6 px-3 py-2`}>{finalScore} ({letterGrade.letter})</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
