import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Award, Save } from 'lucide-react';

export default function DosenNilai() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [mahasiswa, setMahasiswa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gradesData, setGradesData] = useState({});
  const [saveStatus, setSaveStatus] = useState('');

  // Fetch Schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await api.get('/schedules');
        const mySchedules = res.data.filter(s => s.dosen_id === user.id);
        setSchedules(mySchedules);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchedules();
  }, [user.id]);

  // Fetch Enrolled Students for selected Schedule
  useEffect(() => {
    if (!selectedSchedule) return;

    const fetchStudentsAndGrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/grades/${selectedSchedule}`);
        setMahasiswa(res.data);
        
        const initial = {};
        res.data.forEach(m => {
          initial[m.mahasiswa_id] = { uts: m.uts, uas: m.uas, kehadiran: m.kehadiran, tugas: m.tugas };
        });
        setGradesData(initial);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentsAndGrades();
  }, [selectedSchedule]);

  const handleGradeChange = (mhsId, field, value) => {
    setGradesData(prev => ({
      ...prev,
      [mhsId]: {
        ...prev[mhsId],
        [field]: parseInt(value) || 0
      }
    }));
  };

  const calculateFinal = (grades) => {
    return Math.round((grades.kehadiran * 0.1) + (grades.tugas * 0.2) + (grades.uts * 0.3) + (grades.uas * 0.4));
  };

  const getLetter = (score) => {
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  };

  const handleSave = async () => {
    if (!selectedSchedule) return;
    setSaveStatus('Menyimpan nilai...');
    
    try {
      await api.put(`/grades/${selectedSchedule}`, {
        grades: gradesData
      });
      setSaveStatus('Berhasil disimpan!');
      setTimeout(() => setSaveStatus(''), 4000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Gagal menyimpan nilai.');
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Input Nilai Mahasiswa</h3>
      </div>
      
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body p-4">
          <label className="form-label text-muted small fw-bold">Pilih Matakuliah / Kelas</label>
          <select className="form-select w-50" value={selectedSchedule} onChange={e => setSelectedSchedule(e.target.value)}>
            <option value="">-- Pilih Kelas --</option>
            {schedules.map(s => (
              <option key={s.id} value={s.id}>{s.course_code} - {s.course_name} ({s.day})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedSchedule ? (
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 py-3">NIM</th>
                    <th className="py-3">Nama Mahasiswa</th>
                    <th className="py-3 text-center" style={{ width: '110px' }}>Kehadiran (10%)</th>
                    <th className="py-3 text-center" style={{ width: '110px' }}>Tugas (20%)</th>
                    <th className="py-3 text-center" style={{ width: '120px' }}>UTS (30%)</th>
                    <th className="py-3 text-center" style={{ width: '120px' }}>UAS (40%)</th>
                    <th className="py-3 text-center">Nilai Akhir</th>
                    <th className="pe-4 py-3 text-center">Huruf</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-4">Memuat data mahasiswa...</td></tr>
                  ) : mahasiswa.map((m) => {
                    const studentGrades = gradesData[m.mahasiswa_id] || { kehadiran: 0, tugas: 0, uts: 0, uas: 0 };
                    const finalScore = calculateFinal(studentGrades);
                    const letterGrade = getLetter(finalScore);
                    
                    return (
                      <tr key={m.mahasiswa_id}>
                        <td className="ps-4 fw-semibold text-muted">{m.mahasiswa_nim}</td>
                        <td className="fw-bold">{m.mahasiswa_name}</td>
                        <td className="text-center text-muted bg-light border-end">{studentGrades.kehadiran}</td>
                        <td className="text-center text-muted bg-light border-end">{studentGrades.tugas}</td>
                        <td>
                          <input type="number" className="form-control form-control-sm text-center fw-bold" 
                                 min="0" max="100" value={studentGrades.uts} 
                                 onChange={(e) => handleGradeChange(m.mahasiswa_id, 'uts', e.target.value)} />
                        </td>
                        <td>
                          <input type="number" className="form-control form-control-sm text-center fw-bold" 
                                 min="0" max="100" value={studentGrades.uas} 
                                 onChange={(e) => handleGradeChange(m.mahasiswa_id, 'uas', e.target.value)} />
                        </td>
                        <td className="text-center fw-bold text-primary fs-5">{finalScore}</td>
                        <td className="pe-4 text-center">
                          <span className={`badge ${letterGrade.includes('A') || letterGrade.includes('B') ? 'bg-success' : 'bg-danger'} fs-6`}>
                            {letterGrade}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-top d-flex justify-content-between align-items-center bg-light rounded-bottom-4">
              <div>
                {saveStatus && (
                  <span className="small fw-bold text-success">
                    {saveStatus}
                  </span>
                )}
              </div>
              <button 
                className="btn btn-primary px-4 fw-bold" 
                onClick={handleSave}
                disabled={mahasiswa.length === 0}
              >
                <Save size={18} className="me-2 mb-1" />
                Simpan Nilai Akhir
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted py-5">
          <Award size={48} className="mb-3 opacity-50" />
          <h5>Pilih Kelas</h5>
          <p>Silakan pilih kelas terlebih dahulu untuk menginput nilai mahasiswa.</p>
        </div>
      )}
    </div>
  );
}
