const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { query, run, get } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();

app.use(cors({
  origin: [
    'https://siakad.arthavirddhisampada.online',
    'http://localhost:5173',
    'http://localhost:7542'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Safe migration: add content column to materials table if it doesn't exist
run("ALTER TABLE materials ADD COLUMN content TEXT").catch(() => {});
run("ALTER TABLE materials ADD COLUMN content_type TEXT DEFAULT 'link'").catch(() => {});

// Add class_ids to schedules so one schedule can hold multiple classes
// Migration already applied, commented out to prevent SQLITE_ERROR crash
// run("ALTER TABLE schedules ADD COLUMN class_ids TEXT").catch(() => {});

// Create rps table if it does not exist yet (all columns nullable so future migrations work)
run(`
  CREATE TABLE IF NOT EXISTS rps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT,
    file_data TEXT,
    uploaded_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`).catch(err => console.error('Error creating rps table:', err));
// Safe migrations for existing rps tables (ignore errors if columns already exist)
run("ALTER TABLE rps ADD COLUMN file_data TEXT").catch(() => {});
run("ALTER TABLE rps ADD COLUMN file_url TEXT").catch(() => {});


run(`
  CREATE TABLE IF NOT EXISTS course_grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER,
    mahasiswa_id INTEGER,
    nilai_uts INTEGER DEFAULT 0,
    nilai_uas INTEGER DEFAULT 0,
    UNIQUE(schedule_id, mahasiswa_id)
  )
`).catch(err => console.error('Error creating course_grades table:', err));

run(`
  CREATE TABLE IF NOT EXISTS attendance_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    meeting_number INTEGER NOT NULL,
    note TEXT,
    UNIQUE(schedule_id, meeting_number)
  )
`).catch(err => console.error('Error creating attendance_notes table:', err));

// Helper middleware to verify token (Authentication)
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  
  jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

// Helper middleware for Role Authorization
const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden. Requires role: ' + roles.join(', ') });
    }
    next();
  };
};

// --- AUTENTIKASI ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { nidn_nim, password } = req.body;
    
    // Find user
    const [users] = await query('SELECT * FROM users WHERE nidn_nim = ?', [nidn_nim]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = users[0];
    
    // Check password
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });
    
    // Generate token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: 86400 // 24 hours
    });
    
    res.status(200).json({
      id: user.id,
      nidn_nim: user.nidn_nim,
      name: user.name,
      role: user.role,
      token: token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const [users] = await query('SELECT id, nidn_nim, name, role FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/auth/change-password', verifyToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    
    // Fetch current user
    const [users] = await query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];
    
    // Verify old password
    const passwordIsValid = await bcrypt.compare(old_password, user.password);
    if (!passwordIsValid) return res.status(401).json({ error: 'Password lama salah' });
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);
    
    // Update password
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.userId]);
    
    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Gagal mengubah password' });
  }
});

// --- ADMIN ROUTES ---
app.get('/api/users', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  const { role } = req.query; // 'dosen' or 'mahasiswa'
  let sql = 'SELECT id, nidn_nim, name, role, created_at FROM users';
  const params = [];
  
  if (role === 'mahasiswa') {
    sql = `
      SELECT u.id, u.nidn_nim, u.name, u.role, u.created_at, 
             ce.class_id, c.name as class_name 
      FROM users u 
      LEFT JOIN class_enrollments ce ON u.id = ce.mahasiswa_id
      LEFT JOIN classes c ON ce.class_id = c.id
      WHERE u.role = 'mahasiswa'
    `;
  } else if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }
  
  try {
    const [users] = await query(sql, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching users' });
  }
});

app.post('/api/users', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { nidn_nim, name, role, password } = req.body;
    // Basic validation
    if (!nidn_nim || !name || !role || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)',
      [nidn_nim, name, role, hashedPassword]
    );
    res.status(201).json({ message: 'User created successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating user' });
  }
});

app.put('/api/users/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { nidn_nim, name, password } = req.body;
    let sql = 'UPDATE users SET nidn_nim = ?, name = ?';
    const params = [nidn_nim, name];
    
    if (password) {
      sql += ', password = ?';
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
    }
    
    sql += ' WHERE id = ?';
    params.push(req.params.id);
    
    await run(sql, params);

    const { role, class_id } = req.body;
    if (role === 'mahasiswa') {
      await run('DELETE FROM class_enrollments WHERE mahasiswa_id = ?', [req.params.id]);
      if (class_id) {
         await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [class_id, req.params.id]);
      }
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed updating user' });
  }
});

app.delete('/api/users/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting user' });
  }
});

// --- COURSES (Matakuliah) ---
app.get('/api/courses', [verifyToken], async (req, res) => {
  try {
    const [courses] = await query('SELECT * FROM courses');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching courses' });
  }
});

app.post('/api/courses', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { code, name, sks, semester } = req.body;
    const result = await run(
      'INSERT INTO courses (code, name, sks, semester) VALUES (?, ?, ?, ?)', 
      [code, name, sks, semester]
    );
    res.status(201).json({ message: 'Course created successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating course' });
  }
});

app.put('/api/courses/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { code, name, sks, semester } = req.body;
    await run(
      'UPDATE courses SET code = ?, name = ?, sks = ?, semester = ? WHERE id = ?',
      [code, name, sks, semester, req.params.id]
    );
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating course' });
  }
});

app.delete('/api/courses/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting course' });
  }
});

// --- CLASSES (Kelas & Enrollments) ---
app.get('/api/classes', [verifyToken], async (req, res) => {
  try {
    const [classes] = await query('SELECT * FROM classes');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching classes' });
  }
});

app.post('/api/classes', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { name } = req.body;
    const result = await run(
      'INSERT INTO classes (name) VALUES (?)', 
      [name]
    );
    res.status(201).json({ message: 'Class created successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating class' });
  }
});

app.put('/api/classes/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { name } = req.body;
    await run('UPDATE classes SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating class' });
  }
});

app.delete('/api/classes/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM classes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting class' });
  }
});

app.get('/api/enrollments', [verifyToken], async (req, res) => {
  try {
    const { class_id, class_ids } = req.query;
    let sql = `
      SELECT ce.*, u.name as mahasiswa_name, u.nidn_nim as mahasiswa_nim 
      FROM class_enrollments ce
      JOIN users u ON ce.mahasiswa_id = u.id
    `;
    const params = [];
    
    if (class_ids) {
      let idsArr = [];
      try { idsArr = JSON.parse(class_ids); } catch(e){}
      if (idsArr.length > 0) {
        const placeholders = idsArr.map(() => '?').join(',');
        sql += ` WHERE ce.class_id IN (${placeholders})`;
        params.push(...idsArr);
      }
    } else if (class_id) {
      sql += ' WHERE ce.class_id = ?';
      params.push(class_id);
    }
    
    const [enrollments] = await query(sql, params);
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching enrollments' });
  }
});

app.delete('/api/enrollments/:mahasiswaId', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM class_enrollments WHERE mahasiswa_id = ?', [req.params.mahasiswaId]);
    res.json({ message: 'Mahasiswa berhasil dikeluarkan dari kelas' });
  } catch (error) {
    res.status(500).json({ error: 'Failed removing student from class' });
  }
});

app.post('/api/enrollments/bulk', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { class_id, mahasiswa_ids } = req.body;
    if (!Array.isArray(mahasiswa_ids)) return res.status(400).json({ error: 'mahasiswa_ids must be an array' });
    
    // Check for already enrolled students across ALL classes
    const placeholders = mahasiswa_ids.map(() => '?').join(',');
    const [existing] = await query(`SELECT mahasiswa_id FROM class_enrollments WHERE mahasiswa_id IN (${placeholders})`, mahasiswa_ids);
    
    const existingIds = existing.map(e => e.mahasiswa_id);
    const newIds = mahasiswa_ids.filter(id => !existingIds.includes(parseInt(id)));

    if (newIds.length === 0 && mahasiswa_ids.length > 0) {
      return res.status(400).json({ error: 'Semua mahasiswa yang dipilih sudah terdaftar di kelas lain.' });
    }
    
    let count = 0;
    for (const mhs_id of newIds) {
      try {
         await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [class_id, mhs_id]);
         count++;
      } catch (e) {
         // Ignore other potential errors
      }
    }
    
    if (count < mahasiswa_ids.length) {
      return res.status(201).json({ message: `Berhasil mendaftarkan ${count} mahasiswa. Beberapa mahasiswa diabaikan karena sudah terdaftar di kelas lain.` });
    }

    res.status(201).json({ message: `Berhasil mendaftarkan ${count} mahasiswa ke kelas` });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Gagal mendaftarkan mahasiswa' });
  }
});

// --- SCHEDULES (Jadwal) ---
app.get('/api/schedules', [verifyToken], async (req, res) => {
  try {
    const [schedules] = await query(`
      SELECT s.*, c.name as course_name, c.code as course_code, cl.name as single_class_name, u.name as dosen_name
      FROM schedules s
      LEFT JOIN classes cl ON s.class_id = cl.id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.dosen_id = u.id
    `);
    
    // We need to fetch all classes to map the JSON class_ids to names
    const [allClasses] = await query('SELECT * FROM classes');
    const classMap = {};
    allClasses.forEach(c => classMap[c.id] = c.name);

    const formattedSchedules = schedules.map(s => {
       let parsedIds = [];
       let classNames = [];
       if (s.class_ids) {
          try { parsedIds = JSON.parse(s.class_ids); } catch(e){}
          classNames = parsedIds.map(id => classMap[id]).filter(Boolean);
       } else if (s.class_id) {
          parsedIds = [s.class_id];
          classNames = [s.single_class_name];
       }
       return {
         ...s,
         class_ids_array: parsedIds,
         class_name: classNames.join(', ') // "Kelas A, Kelas B"
       };
    });

    let finalSchedules = formattedSchedules;

    // Filter by student's enrolled class if role is mahasiswa
    if (req.userRole === 'mahasiswa') {
       const [enrolls] = await query('SELECT class_id FROM class_enrollments WHERE mahasiswa_id = ?', [req.userId]);
       const enrolledClassIds = enrolls.map(e => e.class_id);
       
       finalSchedules = formattedSchedules.filter(s => 
          s.class_ids_array.some(id => enrolledClassIds.includes(parseInt(id)))
       );
    }

    res.json(finalSchedules);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching schedules', details: error.message });
  }
});

app.post('/api/schedules', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    // Note: class_ids is expected to be an array of integers e.g. [1, 2]
    const { class_ids, course_id, dosen_id, day, time_start, time_end, room } = req.body;
    
    // Default fallback if old single class_id is sent
    const newClassIds = class_ids || (req.body.class_id ? [parseInt(req.body.class_id)] : []);
    if (newClassIds.length === 0) return res.status(400).json({ error: 'Pilih setidaknya 1 kelas.' });

    // --- CONFLICT VALIDATION LOGIC ---
    const [existingScheds] = await query('SELECT * FROM schedules WHERE day = ?', [day]);
    
    const toMins = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    const newStart = toMins(time_start);
    const newEnd = toMins(time_end);
    
    for (const sched of existingScheds) {
      const extStart = toMins(sched.time_start);
      const extEnd = toMins(sched.time_end);
      
      const isOverlap = Math.max(newStart, extStart) < Math.min(newEnd, extEnd);
      
      if (isOverlap) {
        let existingIds = [];
        if (sched.class_ids) {
            try { existingIds = JSON.parse(sched.class_ids); } catch(e){}
        } else if (sched.class_id) {
            existingIds = [sched.class_id];
        }
        
        const classOverlap = newClassIds.some(id => existingIds.includes(parseInt(id)));

        if (classOverlap) {
           return res.status(400).json({ error: 'Jadwal Bentrok: Salah satu kelas ini sudah memiliki jadwal pada jam tersebut.' });
        }
        if (sched.dosen_id == dosen_id) {
           return res.status(400).json({ error: 'Jadwal Bentrok: Dosen ini sedang mengajar di kelas lain pada jam tersebut.' });
        }
        if (room && sched.room && sched.room.toLowerCase() === room.toLowerCase()) {
           return res.status(400).json({ error: 'Jadwal Bentrok: Ruangan sudah digunakan oleh kelas lain pada jam tersebut.' });
        }
      }
    }
    // --- END CONFLICT VALIDATION ---

    const result = await run(
      'INSERT INTO schedules (class_id, class_ids, course_id, dosen_id, day, time_start, time_end, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [newClassIds[0], JSON.stringify(newClassIds), course_id, dosen_id, day, time_start, time_end, room]
    );
    res.status(201).json({ message: 'Schedule created', id: result.id });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed creating schedule', details: error.message });
  }
});

app.put('/api/schedules/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { class_ids, course_id, dosen_id, day, time_start, time_end, room } = req.body;
    
    const newClassIds = class_ids || (req.body.class_id ? [parseInt(req.body.class_id)] : []);
    if (newClassIds.length === 0) return res.status(400).json({ error: 'Pilih setidaknya 1 kelas.' });

    // --- CONFLICT VALIDATION LOGIC ---
    const [existingScheds] = await query('SELECT * FROM schedules WHERE day = ? AND id != ?', [day, req.params.id]);
    
    const toMins = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    const newStart = toMins(time_start);
    const newEnd = toMins(time_end);
    
    for (const sched of existingScheds) {
      const extStart = toMins(sched.time_start);
      const extEnd = toMins(sched.time_end);
      
      const isOverlap = Math.max(newStart, extStart) < Math.min(newEnd, extEnd);
      
      if (isOverlap) {
        let existingIds = [];
        if (sched.class_ids) {
            try { existingIds = JSON.parse(sched.class_ids); } catch(e){}
        } else if (sched.class_id) {
            existingIds = [sched.class_id];
        }
        
        const classOverlap = newClassIds.some(id => existingIds.includes(parseInt(id)));

        if (classOverlap) {
           return res.status(400).json({ error: 'Jadwal Bentrok: Salah satu kelas ini sudah memiliki jadwal pada jam tersebut.' });
        }
        if (sched.dosen_id == dosen_id) {
           return res.status(400).json({ error: 'Jadwal Bentrok: Dosen ini sedang mengajar di kelas lain pada jam tersebut.' });
        }
        if (room && sched.room && sched.room.toLowerCase() === room.toLowerCase()) {
           return res.status(400).json({ error: 'Jadwal Bentrok: Ruangan sudah digunakan oleh kelas lain pada jam tersebut.' });
        }
      }
    }
    // --- END CONFLICT VALIDATION ---

    await run(
      'UPDATE schedules SET class_id = ?, class_ids = ?, course_id = ?, dosen_id = ?, day = ?, time_start = ?, time_end = ?, room = ? WHERE id = ?',
      [newClassIds[0], JSON.stringify(newClassIds), course_id, dosen_id, day, time_start, time_end, room, req.params.id]
    );
    res.json({ message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed updating schedule', details: error.message });
  }
});

app.delete('/api/schedules/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting schedule' });
  }
});

app.get('/api/notifications', [verifyToken], async (req, res) => {
  try {
    if (req.userRole === 'mahasiswa') {
      const [notifs] = await query(`
        SELECT a.id, a.schedule_id, a.title, a.deadline, c.name as course_name 
        FROM assignments a
        JOIN schedules s ON a.schedule_id = s.id
        JOIN courses c ON s.course_id = c.id
        JOIN class_enrollments ce ON s.class_id = ce.class_id OR s.class_ids LIKE '%"' || ce.class_id || '"%' OR s.class_ids LIKE '%[' || ce.class_id || ']%' OR s.class_ids LIKE '%,' || ce.class_id || ']%' OR s.class_ids LIKE '%[' || ce.class_id || ',%' OR s.class_ids LIKE '%,' || ce.class_id || ',%'
        WHERE ce.mahasiswa_id = ?
          AND datetime(a.deadline) > datetime('now', 'localtime')
          AND a.id NOT IN (SELECT assignment_id FROM submissions WHERE mahasiswa_id = ?)
        ORDER BY a.deadline ASC
        LIMIT 5
      `, [req.userId, req.userId]);
      
      const countRes = await query(`
        SELECT COUNT(*) as cnt
        FROM assignments a
        JOIN schedules s ON a.schedule_id = s.id
        JOIN class_enrollments ce ON s.class_id = ce.class_id OR s.class_ids LIKE '%"' || ce.class_id || '"%' OR s.class_ids LIKE '%[' || ce.class_id || ']%' OR s.class_ids LIKE '%,' || ce.class_id || ']%' OR s.class_ids LIKE '%[' || ce.class_id || ',%' OR s.class_ids LIKE '%,' || ce.class_id || ',%'
        WHERE ce.mahasiswa_id = ?
          AND datetime(a.deadline) > datetime('now', 'localtime')
          AND a.id NOT IN (SELECT assignment_id FROM submissions WHERE mahasiswa_id = ?)
      `, [req.userId, req.userId]);
      
      return res.json({ count: countRes[0][0].cnt, items: notifs });
    } else if (req.userRole === 'dosen') {
      const [notifs] = await query(`
        SELECT sub.id, sub.assignment_id, sub.submitted_at, u.name as mahasiswa_name, a.title, c.name as course_name
        FROM submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        JOIN schedules s ON a.schedule_id = s.id
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON sub.mahasiswa_id = u.id
        WHERE s.dosen_id = ? AND sub.nilai IS NULL
        ORDER BY sub.submitted_at DESC
        LIMIT 5
      `, [req.userId]);
      
      const countRes = await query(`
        SELECT COUNT(*) as cnt
        FROM submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        JOIN schedules s ON a.schedule_id = s.id
        WHERE s.dosen_id = ?
          AND datetime(sub.submitted_at) > datetime('now', '-7 days', 'localtime')
          AND sub.nilai IS NULL
      `, [req.userId]);
      
      return res.json({ count: countRes[0][0].cnt, items: notifs });
    } else {
      return res.json({ count: 0, items: [] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed getting notifications' });
  }
});

// --- DOSEN & MAHASISWA (Academic Features) ---
// Note: For a prototype, these will return generic / mock data when tables are empty
app.get('/api/materials/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const [materials] = await query('SELECT * FROM materials WHERE schedule_id = ?', [req.params.scheduleId]);
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching materials' });
  }
});

app.post('/api/materials', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, title, description, file_url, content, content_type } = req.body;
    const result = await run(
      'INSERT INTO materials (schedule_id, title, description, file_url, content, content_type) VALUES (?, ?, ?, ?, ?, ?)',
      [schedule_id, title, description, file_url || null, content || null, content_type || 'link']
    );
    res.status(201).json({ message: 'Material uploaded', id: result.id });
  } catch (error) {
    console.error('Material upload error:', error);
    res.status(500).json({ error: 'Failed uploading material' });
  }
});

app.put('/api/materials/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { title, description, file_url, content, content_type } = req.body;
    await run(
      'UPDATE materials SET title = ?, description = ?, file_url = ?, content = ?, content_type = ? WHERE id = ?',
      [title, description, file_url || null, content || null, content_type || 'link', req.params.id]
    );
    res.json({ message: 'Material updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating material' });
  }
});

app.delete('/api/materials/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    await run('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting material' });
  }
});

// Assignments
app.get('/api/assignments/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const [assignments] = await query('SELECT * FROM assignments WHERE schedule_id = ?', [req.params.scheduleId]);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching assignments' });
  }
});

app.post('/api/assignments', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, title, description, deadline } = req.body;
    const result = await run(
      'INSERT INTO assignments (schedule_id, title, description, deadline) VALUES (?, ?, ?, ?)',
      [schedule_id, title, description, deadline]
    );
    res.status(201).json({ message: 'Assignment created', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating assignment' });
  }
});

app.put('/api/assignments/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    await run(
      'UPDATE assignments SET title = ?, description = ?, deadline = ? WHERE id = ?',
      [title, description, deadline, req.params.id]
    );
    res.json({ message: 'Assignment updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating assignment' });
  }
});

app.delete('/api/assignments/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    // Delete associated submissions first to avoid orphaned data
    await run('DELETE FROM submissions WHERE assignment_id = ?', [req.params.id]);
    await run('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting assignment' });
  }
});


// Attendance (Absensi)
app.get('/api/rps/:courseId', [verifyToken], async (req, res) => {
  try {
    const [records] = await query('SELECT * FROM rps WHERE course_id = ? ORDER BY uploaded_at DESC', [req.params.courseId]);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching RPS' });
  }
});

app.post('/api/rps', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { course_id, title, file_url, file_data } = req.body;
    const result = await run(
      'INSERT INTO rps (course_id, title, file_url, file_data) VALUES (?, ?, ?, ?)',
      [course_id, title, file_url || null, file_data || null]
    );
    res.status(201).json({ message: 'RPS uploaded', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed uploading RPS' });
  }
});

app.delete('/api/rps/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    await run('DELETE FROM rps WHERE id = ?', [req.params.id]);
    res.json({ message: 'RPS deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting RPS' });
  }
});

// Attendance (Absensi)
app.get('/api/attendance/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const meeting_number = req.query.meeting_number;
    let queryStr = 'SELECT * FROM attendance WHERE schedule_id = ?';
    const params = [req.params.scheduleId];
    
    if (meeting_number) {
      queryStr += ' AND meeting_number = ?';
      params.push(parseInt(meeting_number));
    }
    
    const [records] = await query(queryStr, params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching attendance records' });
  }
});

app.post('/api/attendance', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, mahasiswa_id, meeting_number, status, date } = req.body;
    
    // Upsert logic: remove any existing record for this student on this meeting
    await run('DELETE FROM attendance WHERE schedule_id = ? AND mahasiswa_id = ? AND meeting_number = ?', [schedule_id, mahasiswa_id, meeting_number]);
    
    const result = await run(
      'INSERT INTO attendance (schedule_id, mahasiswa_id, meeting_number, status, date) VALUES (?, ?, ?, ?, ?)',
      [schedule_id, mahasiswa_id, meeting_number, status, date]
    );
    res.status(201).json({ message: 'Attendance recorded', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed recording attendance' });
  }
});

app.get('/api/attendance-note/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const meeting_number = req.query.meeting_number;
    if (!meeting_number) return res.status(400).json({ error: 'meeting_number required' });
    
    const [notes] = await query('SELECT note FROM attendance_notes WHERE schedule_id = ? AND meeting_number = ?', [req.params.scheduleId, meeting_number]);
    res.json(notes.length > 0 ? notes[0] : { note: '' });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

app.post('/api/attendance-note', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, meeting_number, note } = req.body;
    await run('DELETE FROM attendance_notes WHERE schedule_id = ? AND meeting_number = ?', [schedule_id, meeting_number]);
    const result = await run(
      'INSERT INTO attendance_notes (schedule_id, meeting_number, note) VALUES (?, ?, ?)',
      [schedule_id, meeting_number, note || '']
    );
    res.status(201).json({ message: 'Note saved', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed saving note' });
  }
});

// Submissions (Kumpul Tugas Mahasiswa)
run("ALTER TABLE submissions ADD COLUMN file_data TEXT").catch(() => {});

app.post('/api/submissions', [verifyToken], async (req, res) => {
  try {
    const { assignment_id, file_url, file_data } = req.body;
    const mahasiswa_id = req.userId;
    
    // Upsert: delete existing then insert
    await run('DELETE FROM submissions WHERE assignment_id = ? AND mahasiswa_id = ?', [assignment_id, mahasiswa_id]);
    
    const result = await run(
      'INSERT INTO submissions (assignment_id, mahasiswa_id, file_url, file_data) VALUES (?, ?, ?, ?)',
      [assignment_id, mahasiswa_id, file_url || null, file_data || null]
    );
    res.status(201).json({ message: 'Tugas berhasil dikumpulkan', id: result.id });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Gagal mengumpulkan tugas' });
  }
});

app.get('/api/submissions/:assignmentId', [verifyToken], async (req, res) => {
  try {
    const [subs] = await query(
      `SELECT s.*, u.name as mahasiswa_name, u.nidn_nim as mahasiswa_nim 
       FROM submissions s JOIN users u ON s.mahasiswa_id = u.id
       WHERE s.assignment_id = ?`,
      [parseInt(req.params.assignmentId)]
    );
    res.json(subs);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching submissions' });
  }
});

app.delete('/api/submissions/:assignmentId', [verifyToken], async (req, res) => {
  try {
    const mahasiswa_id = req.userId;
    const assignment_id = parseInt(req.params.assignmentId);
    
    await run('DELETE FROM submissions WHERE assignment_id = ? AND mahasiswa_id = ?', [assignment_id, mahasiswa_id]);
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Grades (Nilai)
run(`CREATE TABLE IF NOT EXISTS course_grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  schedule_id INTEGER, 
  mahasiswa_id INTEGER, 
  nilai_uts INTEGER DEFAULT 0, 
  nilai_uas INTEGER DEFAULT 0, 
  UNIQUE(schedule_id, mahasiswa_id)
)`).catch(()=>{});

app.get('/api/grades/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    
    // 1. Get schedule info (for class_ids)
    const [schedRows] = await query('SELECT class_id, class_ids FROM schedules WHERE id = ?', [scheduleId]);
    if (schedRows.length === 0) return res.status(404).json({error: 'Schedule not found'});
    
    let targetClassIds = [];
    if (schedRows[0].class_ids) {
      try { targetClassIds = JSON.parse(schedRows[0].class_ids); } catch(e){}
    } else if (schedRows[0].class_id) {
      targetClassIds = [schedRows[0].class_id];
    }
    
    if (targetClassIds.length === 0) return res.json([]);

    // 2. Get all enrolled students matching any of the class_ids
    const placeholders = targetClassIds.map(() => '?').join(',');
    const [students] = await query(`
      SELECT u.id as mahasiswa_id, u.nidn_nim as mahasiswa_nim, u.name as mahasiswa_name 
      FROM class_enrollments ce 
      JOIN users u ON ce.mahasiswa_id = u.id 
      WHERE ce.class_id IN (${placeholders})
    `, targetClassIds);

    // 3. Get total meetings for attendance percentage
    const [attRows] = await query('SELECT COUNT(DISTINCT meeting_number) as total_meetings FROM attendance WHERE schedule_id = ?', [scheduleId]);
    const totalMeetings = attRows[0].total_meetings || 0;

    // 4. Fetch the data per student
    const result = [];
    for (const st of students) {
      const mhsId = st.mahasiswa_id;

      // Calculate Attendance (Kehadiran) percentage
      let kehadiran = 0;
      if (totalMeetings > 0) {
        const [presentRows] = await query('SELECT COUNT(*) as present FROM attendance WHERE schedule_id = ? AND mahasiswa_id = ? AND status = ?', [scheduleId, mhsId, 'Hadir']);
        kehadiran = Math.round((presentRows[0].present / totalMeetings) * 100);
      }

      // Calculate Avg Tugas (Assignments)
      let avgTugas = 0;
      const [tugasRows] = await query(`
        SELECT s.nilai 
        FROM submissions s 
        JOIN assignments a ON s.assignment_id = a.id 
        WHERE a.schedule_id = ? AND s.mahasiswa_id = ? AND s.nilai IS NOT NULL
      `, [scheduleId, mhsId]);
      
      if (tugasRows.length > 0) {
        let sum = tugasRows.reduce((acc, row) => acc + row.nilai, 0);
        avgTugas = Math.round(sum / tugasRows.length);
      }

      // Get UTS & UAS
      let uts = 0;
      let uas = 0;
      const [gradeRows] = await query('SELECT nilai_uts, nilai_uas FROM course_grades WHERE schedule_id = ? AND mahasiswa_id = ?', [scheduleId, mhsId]);
      if (gradeRows.length > 0) {
        uts = gradeRows[0].nilai_uts;
        uas = gradeRows[0].nilai_uas;
      }

      const final_score = Math.round((kehadiran * 0.1) + (avgTugas * 0.2) + (uts * 0.3) + (uas * 0.4));

      result.push({
        mahasiswa_id: mhsId,
        mahasiswa_nim: st.mahasiswa_nim,
        mahasiswa_name: st.mahasiswa_name,
        kehadiran: kehadiran,
        tugas: avgTugas,
        uts: uts,
        uas: uas,
        final_score: final_score
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Grades error:', error);
    res.status(500).json({ error: 'Failed fetching grades' });
  }
});

app.put('/api/grades/:scheduleId', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const { grades } = req.body; // expected format: { mahasiswa_id: { uts: 80, uas: 90 }, ... }

    for (const [mhsId, data] of Object.entries(grades)) {
      // Upsert
      await run('DELETE FROM course_grades WHERE schedule_id = ? AND mahasiswa_id = ?', [scheduleId, mhsId]);
      await run('INSERT INTO course_grades (schedule_id, mahasiswa_id, nilai_uts, nilai_uas) VALUES (?, ?, ?, ?)', [
        scheduleId, mhsId, data.uts || 0, data.uas || 0
      ]);
    }
    
    res.json({ message: 'Grades saved successfully' });
  } catch (error) {
    console.error('Save grades error:', error);
    res.status(500).json({ error: 'Failed saving grades' });
  }
});

app.put('/api/submissions/:id/nilai', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const { nilai } = req.body;
    await run('UPDATE submissions SET nilai = ? WHERE id = ?', [nilai, req.params.id]);
    res.json({ message: 'Nilai berhasil disimpan' });
  } catch (error) {
    console.error('Update grading error:', error);
    res.status(500).json({ error: 'Gagal menyimpan nilai' });
  }
});

// Serve static files from built React frontend (for production)
app.use(express.static(path.join(__dirname, '../client/dist')));
// SPA fallback: only catch routes without file extensions (not .js, .css, .svg etc)
app.get(/^[^.]*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 7542;
app.listen(PORT, () => {
    console.log(`Server SIAKAD DKN berjalan di port ${PORT}.`);
});

