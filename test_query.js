const { query } = require('./api/db.js');
async function c() {
  const [rows] = await query("SELECT a.id, a.schedule_id, a.title, a.deadline, s.course_name FROM assignments a JOIN schedules s ON a.schedule_id = s.id JOIN class_enrollments ce ON s.class_id = ce.class_id WHERE ce.mahasiswa_id = 6 AND a.deadline > CURRENT_TIMESTAMP AND a.id NOT IN (SELECT assignment_id FROM submissions WHERE mahasiswa_id = 6)");
  console.log('Unsubmitted active assignments:', rows);
  process.exit();
}
c();
