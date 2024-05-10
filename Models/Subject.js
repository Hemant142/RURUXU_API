// subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  field: { type: String, enum: ['Arts', 'Commerce', 'Engineering'], required: true },
});

module.exports = mongoose.model('Subject', subjectSchema);