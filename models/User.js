const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  github: {
    type: String,
  },
  role: {
    type: String,
    default: 2
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('xfs_user', UserSchema);
