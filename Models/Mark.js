// mark.js
const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  marks: { type: Number, required: true },
});

module.exports = mongoose.model('Mark', markSchema);
