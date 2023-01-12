const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    default: 'None',
  },
  salt: {
    type: String,
  },
  password: {
    type: String,
  },
  github: {
    type: String,
  },
  role: {
    type: String,
    default: 2
  },
  register_type: {
    type: String,
    default: 'NORMAL_SIGNUP'
  },
  google_auth_user_id: { 
    type: String 
  },
  avatar: { 
    type: String, 
    default: 'defaultUser.png'
  },  
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('xfs_user', UserSchema);
