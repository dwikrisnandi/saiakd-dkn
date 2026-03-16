import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CheckSquare } from 'lucide-react';

export default function DosenKehadiran() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [mahasiswa, setMahasiswa] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Meetings 1-16, excluding 8 (UTS) and 16 (UAS)
  const meetings = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  const [selectedMeeting, setSelectedMeeting] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [attendanceData, setAttendanceData] = useState({});
  const [meetingNote, setMeetingNote] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // 1. Fetch Dosen's Schedules
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

  // 2. Fetch Enrolled Students & Existing Attendance
  useEffect(() => {
    if (!selectedSchedule) return;

    const selectedSched = schedules.find(s => s.id === parseInt(selectedSchedule));
    if (!selectedSched) return;

    const fetchStudentsAndAttendance = async () => {
      setLoading(true);
      try {
        // Fetch Students
        let enrollmentsUrl = `/enrollments?class_id=${selectedSched.class_id}`;
        if (selectedSched.class_ids_array && selectedSched.class_ids_array.length > 0) {
          enrollmentsUrl = `/enrollments?class_ids=${JSON.stringify(selectedSched.class_ids_array)}`;
        }
        
        const resStudents = await api.get(enrollmentsUrl);
        const students = resStudents.data.map(e => ({
          id: e.mahasiswa_id,
          nidn_nim: e.mahasiswa_nim,
          name: e.mahasiswa_name
        }));
        setMahasiswa(students);
        
        // Fetch Existing Attendance for this meeting
        const resAttendance = await api.get(`/attendance/${selectedSchedule}?meeting_number=${selectedMeeting}`);
        const existingRecords = resAttendance.data;

        // Fetch Existing Note for this meeting
        try {
          const resNote = await api.get(`/attendance-note/${selectedSchedule}?meeting_number=${selectedMeeting}`);
          setMeetingNote(resNote.data?.note || '');
        } catch(e) {
          setMeetingNote('');
        }

        // Initialize state
        const initialMap = {};
        let savedDate = null;
        
        students.forEach(m => {
          const record = existingRecords.find(r => r.mahasiswa_id === m.id);
          if (record) {
            // Mapping any legacy 'Izin' or 'Sakit' to the new 'Izin/Sakit' if needed, but we save as-is.
            initialMap[m.id] = record.status === 'Izin' || record.status === 'Sakit' ? 'Izin/Sakit' : record.status;
            if (!savedDate) savedDate = record.date;
          } else {
            initialMap[m.id] = 'Alpa'; // Default placeholder, behaves as Tidak Hadir
          }
        });
        
        setAttendanceData(initialMap);
        if (savedDate) {
          setDate(savedDate);
        } else {
          setDate(new Date().toISOString().split('T')[0]); // Reset to today if no saved date
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentsAndAttendance();
  }, [selectedSchedule, selectedMeeting, schedules]);

  const handleStatusChange = (mhsId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [mhsId]: status
    }));
  };

  const handleSave = async () => {
    if (!selectedSchedule) return;
    setSaveStatus('Menyimpan...');

    const promises = Object.keys(attendanceData).map(mhsId => {
      return api.post('/attendance', {
        schedule_id: parseInt(selectedSchedule),
        mahasiswa_id: parseInt(mhsId),
        meeting_number: parseInt(selectedMeeting),
        status: attendanceData[mhsId],
        date: date
      });
    });

    // Add saving Note to promises
    promises.push(
      api.post('/attendance-note', {
        schedule_id: parseInt(selectedSchedule),
        meeting_number: parseInt(selectedMeeting),
        note: meetingNote
      })
    );

    try {
      await Promise.all(promises);
      setSaveStatus('Berhasil disimpan!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Gagal menyimpan.');
    }
  };

  return (
    <div className="animate-fade-in">
      <h3 className="fw-bold mb-4">Input Kehadiran Mahasiswa</h3>
      
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label text-muted small fw-bold">Pilih Matakuliah / Kelas</label>
              <select className="form-select" value={selectedSchedule} onChange={e => setSelectedSchedule(e.target.value)}>
                <option value="">-- Pilih Kelas --</option>
                {schedules.map(s => (
                  <option key={s.id} value={s.id}>{s.course_code} - {s.course_name} ({s.day})</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-4">
              <label className="form-label text-muted small fw-bold">Pertemuan Ke</label>
              <select className="form-select" value={selectedMeeting} onChange={e => setSelectedMeeting(parseInt(e.target.value))} disabled={!selectedSchedule}>
                {meetings.map(m => (
                  <option key={m} value={m}>Pertemuan {m}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label text-muted small fw-bold">Tanggal</label>
              <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} disabled={!selectedSchedule} />
            </div>
          </div>
        </div>
      </div>

      {selectedSchedule && (
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 py-3">NIM</th>
                    <th className="py-3">Nama Mahasiswa</th>
                    <th className="pe-4 py-3">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" className="text-center py-4">Memuat mahasiswa...</td></tr>
                  ) : mahasiswa.map((m) => (
                      <tr key={m.id}>
                        <td className="ps-4 fw-semibold text-muted">{m.nidn_nim}</td>
                        <td className="fw-bold">{m.name}</td>
                        <td className="pe-4">
                          <select 
                            className={`form-select form-select-sm fw-bold w-auto ${
                              attendanceData[m.id] === 'Hadir' ? 'bg-success-subtle text-success border-success-subtle' :
                              attendanceData[m.id] === 'Izin/Sakit' ? 'bg-warning-subtle text-warning border-warning-subtle' :
                              'bg-danger-subtle text-danger border-danger-subtle'
                            }`}
                            value={attendanceData[m.id]} 
                            onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          >
                            <option value="Alpa">--kehadiran--</option>
                            <option value="Hadir">Hadir</option>
                            <option value="Izin/Sakit">Izin/Sakit</option>
                          </select>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-top bg-light">
              <label className="form-label fw-bold text-muted small">Resume / Catatan Hasil Pertemuan</label>
              <textarea 
                className="form-control mb-3" 
                rows="3" 
                placeholder="Tuliskan ringkasan materi yang diajarkan atau catatan penting pada pertemuan ini..."
                value={meetingNote}
                onChange={(e) => setMeetingNote(e.target.value)}
              ></textarea>
            </div>
            
            <div className="p-4 border-top d-flex justify-content-between align-items-center bg-white rounded-bottom-4">
              <div>
                {saveStatus && (
                  <span className={`small fw-bold ${saveStatus.includes('Gagal') ? 'text-danger' : 'text-success'}`}>
                    {saveStatus}
                  </span>
                )}
              </div>
              <button 
                className="btn btn-primary px-4 fw-bold" 
                onClick={handleSave}
                disabled={mahasiswa.length === 0}
              >
                <CheckSquare size={18} className="me-2 mb-1" />
                Simpan Kehadiran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
