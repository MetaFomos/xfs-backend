const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'xfs_user',
  },
  category: {
    type: Number, 
    required: true, 
    default: 1
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
  },
  status: {
    type: String,
    default: 0
  },
  wallet: {
    type: String
  },
  milestone: [
    {
        title: {
          type: String,
        },
        date: {
          type: Date,
        },
        amount: {
          type: String,
        },
        gitPullRequestUrl: {
          type: String,
          default: ''
        },
        complete: {
          type: Boolean,
          default: false
        }
    }
  ],
  assigned_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'xfs_user',  
  },
  budget: {
    type: String
  },
  proposals: [
    {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'xfs_user',  
        },
        proposal: {
          type: String
        },
        date: {
          type: Date,
          default: Date.now
        }
    }
  ],
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('xfs_idea', ProfileSchema);
