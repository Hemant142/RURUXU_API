// student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  rollnumber: { type: String, required: true },
  field: { type: String, enum: ['Arts', 'Commerce', 'Engineering'], required: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
});

module.exports = mongoose.model('Student', studentSchema);


