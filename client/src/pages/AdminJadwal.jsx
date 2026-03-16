import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Select from 'react-select';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';

export default function AdminJadwal() {
  const [schedules, setSchedules] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [dosens, setDosens] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    class_ids: [],
    course_id: '',
    dosen_id: '',
    day: 'Senin',
    time_start: '',
    time_end: '',
    room: ''
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    class_ids: [],
    course_id: '',
    dosen_id: '',
    day: 'Senin',
    time_start: '',
    time_end: '',
    room: ''
  });

  const fetchData = async () => {
    try {
      const [schedRes, classRes, courseRes, dosenRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/classes'),
        api.get('/courses'),
        api.get('/users?role=dosen')
      ]);
      setSchedules(schedRes.data);
      setClassesList(classRes.data);
      setCourses(courseRes.data);
      setDosens(dosenRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      await api.post('/schedules', formData);
      setShowModal(false);
      setFormData({ class_ids: [], course_id: '', dosen_id: '', day: 'Senin', time_start: '', time_end: '', room: '' });
      setSuccess('Jadwal berhasil ditambahkan');
      fetchData();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
         setError(err.response.data.error); // Show the specific validation conflict error from API
      } else {
         setError('Gagal menyimpan jadwal kuliah');
      }
    }
  };

  const openEditModal = (sched) => {
    let initialClassIds = [];
    if (sched.class_ids_array && sched.class_ids_array.length > 0) {
      initialClassIds = sched.class_ids_array;
    } else if (sched.class_id) {
      initialClassIds = [sched.class_id];
    }
    setEditFormData({
      id: sched.id,
      class_ids: initialClassIds,
      course_id: sched.course_id,
      dosen_id: sched.dosen_id,
      day: sched.day,
      time_start: sched.time_start,
      time_end: sched.time_end,
      room: sched.room || ''
    });
    setShowEditModal(true);
    setError(''); setSuccess('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      await api.put(`/schedules/${editFormData.id}`, editFormData);
      setShowEditModal(false);
      setSuccess('Jadwal berhasil diupdate');
      fetchData();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
         setError(err.response.data.error);
      } else {
         setError('Gagal mengupdate jadwal kuliah');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus jadwal ini?')) {
      setError(''); setSuccess('');
      try {
        await api.delete(`/schedules/${id}`);
        setSuccess('Jadwal berhasil dihapus');
        fetchData();
      } catch (err) {
        setError('Gagal menghapus jadwal');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Manajemen Jadwal Kuliah</h3>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Buat Jadwal
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 py-3">Kelas & Matakuliah</th>
                  <th className="py-3">Dosen Pengampu</th>
                  <th className="py-3">Hari & Waktu</th>
                  <th className="py-3">Ruangan</th>
                  <th className="pe-4 py-3 text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-4">Memuat data...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">Belum ada jadwal kuliah</td></tr>
                ) : (
                  schedules.map((s, idx) => (
                    <tr key={idx}>
                      <td className="ps-4 fw-semibold">
                        {s.class_name} <br/>
                        <span className="small text-muted fw-normal">{s.course_name}</span>
                      </td>
                      <td>{s.dosen_name}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary-subtle text-primary">{s.day}</span>
                          <span className="text-muted small"><Clock size={14} className="me-1 mb-1"/>{s.time_start} - {s.time_end}</span>
                        </div>
                      </td>
                      <td>{s.room}</td>
                      <td className="pe-4 text-end">
                        <button className="btn btn-sm btn-light text-primary me-2" onClick={() => openEditModal(s)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Buat Jadwal Perkuliahan</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">Pilih Kelas</label>
                        <Select
                          isMulti
                          options={classesList.map(c => ({ value: c.id, label: c.name }))}
                          value={classesList
                                  .filter(c => formData.class_ids.includes(c.id))
                                  .map(c => ({ value: c.id, label: c.name }))}
                          onChange={(selected) => setFormData({...formData, class_ids: selected ? selected.map(item => item.value) : []})}
                          placeholder="-- Pilih Kelas --"
                          classNamePrefix="react-select"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">Matakuliah</label>
                        <select className="form-select" required 
                                value={formData.course_id} onChange={e => setFormData({...formData, course_id: e.target.value})}>
                          <option value="">Pilih Matakuliah</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Dosen Pengampu</label>
                        <select className="form-select" required
                                value={formData.dosen_id} onChange={e => setFormData({...formData, dosen_id: e.target.value})}>
                          <option value="">Pilih Dosen</option>
                          {dosens.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="form-label text-muted small fw-bold">Hari</label>
                        <select className="form-select" required
                                value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})}>
                          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label text-muted small fw-bold">Jam Mulai</label>
                        <input type="time" className="form-control" required
                               value={formData.time_start} onChange={e => setFormData({...formData, time_start: e.target.value})} />
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label text-muted small fw-bold">Jam Selesai</label>
                        <input type="time" className="form-control" required
                               value={formData.time_end} onChange={e => setFormData({...formData, time_end: e.target.value})} />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Ruangan (Opsional)</label>
                      <input type="text" className="form-control" placeholder="Contoh: Lab Komputer 1 / RK 2"
                             value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan Jadwal</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL EDIT JADWAL */}
      {showEditModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Edit Jadwal Perkuliahan</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleEditSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">Pilih Kelas</label>
                        <Select
                          isMulti
                          options={classesList.map(c => ({ value: c.id, label: c.name }))}
                          value={classesList
                                  .filter(c => editFormData.class_ids.includes(c.id))
                                  .map(c => ({ value: c.id, label: c.name }))}
                          onChange={(selected) => setEditFormData({...editFormData, class_ids: selected ? selected.map(item => item.value) : []})}
                          placeholder="-- Pilih Kelas --"
                          classNamePrefix="react-select"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">Matakuliah</label>
                        <select className="form-select" required 
                                value={editFormData.course_id} onChange={e => setEditFormData({...editFormData, course_id: e.target.value})}>
                          <option value="">Pilih Matakuliah</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Dosen Pengampu</label>
                        <select className="form-select" required
                                value={editFormData.dosen_id} onChange={e => setEditFormData({...editFormData, dosen_id: e.target.value})}>
                          <option value="">Pilih Dosen</option>
                          {dosens.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="form-label text-muted small fw-bold">Hari</label>
                        <select className="form-select" required
                                value={editFormData.day} onChange={e => setEditFormData({...editFormData, day: e.target.value})}>
                          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label text-muted small fw-bold">Jam Mulai</label>
                        <input type="time" className="form-control" required
                               value={editFormData.time_start} onChange={e => setEditFormData({...editFormData, time_start: e.target.value})} />
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label text-muted small fw-bold">Jam Selesai</label>
                        <input type="time" className="form-control" required
                               value={editFormData.time_end} onChange={e => setEditFormData({...editFormData, time_end: e.target.value})} />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Ruangan (Opsional)</label>
                      <input type="text" className="form-control" placeholder="Contoh: Lab Komputer 1 / RK 2"
                             value={editFormData.room} onChange={e => setEditFormData({...editFormData, room: e.target.value})} />
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowEditModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan Perubahan</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
