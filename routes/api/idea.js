const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Idea = require('../../models/Idea');

// get the ideas
router.post('/getIdea', auth, async (req, res) => {
  try {
    const { type } = req.body;
    let ideas;
    switch (type) {
      case 'pending':
        ideas = await Idea.find({ status: 0 }).populate('user', ['name', 'github']);
        res.json(ideas);
        break;
      case 'approved':
        ideas = await Idea.find({ status: 1 }).populate('user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
        res.json(ideas);
        break;
      case 'fundrequired':
          ideas = await Idea.find({ status: 2 }).populate('assigned_user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
          res.json(ideas);
          break;
      case 'inprogress':
        ideas = await Idea.find({ status: 3 }).populate('assigned_user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
        res.json(ideas);
        break;
      case 'completed':
          ideas = await Idea.find({ status: 4 }).populate('user', ['name', 'github']).populate('assigned_user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
          res.json(ideas);
          break;
      default:
        break;
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// approve the ideas
router.post('/approveIdea', async (req, res) => {
  try {
    const { wallet, ideaID } = req.body;
    let idea = await Idea.findOneAndUpdate(
      { _id: ideaID },
      { $set: { wallet, status: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    const ideas = await Idea.find({ status: 0 }).populate('user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// Reject the ideas
router.post('/rejectIdea', async (req, res) => {
  try {
    const { ideaId } = req.body;
    let idea = await Idea.findOneAndRemove({ _id: ideaId })
    const ideas = await Idea.find({ status: 0 }).populate('user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// propose the ideas
router.post('/proposeIdea', async (req, res) => {
  try {
    const { ideaId, userId } = req.body;
    let idea = await Idea.findOneAndUpdate(
      { _id: ideaId },
      { $set: { assigned_user: userId, status: 2 } },
    )
    const ideas = await Idea.find({ status: 1 }).populate('user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// set to the inprogess ideas
router.post('/inprogressIdea', async (req, res) => {
  try {
    const { ideaId } = req.body;
    let idea = await Idea.findOneAndUpdate(
      { _id: ideaId },
      { $set: { status: 3 } },
    )
    const ideas = await Idea.find({ status: 2 }).populate('assigned_user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// proposal the idea
router.post('/proposalIdea', auth, async (req, res) => {
  try {
    const { ideaID, proposal } = req.body;
    const idea = await Idea.findById(ideaID);

    // Check if the post has already been liked
    if (idea.proposals.some((proposal) => proposal.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Already proposal' });
    }

    idea.proposals.unshift({ user: req.user.id, proposal });

    await idea.save();

    const ideas = await Idea.find({ status: 1 }).populate('user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// save pull request idea
router.post('/pullRequestSubmit', auth, async (req, res) => {
  try {
    const { ideaId, milestoneIndex, milestoneId, pullRequestUrl } = req.body;
    const idea = await Idea.findById(ideaId);
    idea.milestone[parseInt(milestoneIndex)-1].gitPullRequestUrl = pullRequestUrl;
    await idea.save();
    let ideas;
    ideas = await Idea.find({ status: 3 }).populate('assigned_user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// save confirm pull request idea
router.post('/confirmPullRequestSubmit', auth, async (req, res) => {
  try {
    const { ideaId, milestoneIndex, milestoneId, pullRequestUrl } = req.body;
    const idea = await Idea.findById(ideaId);
    idea.milestone[parseInt(milestoneIndex)-1].complete = true;
    await idea.save();
    let ideas;
    ideas = await Idea.find({ status: 3 }).populate('assigned_user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// move complete idea
router.post('/completeIdea', auth, async (req, res) => {
  try {
    const { ideaId } = req.body;
    let idea = await Idea.findOneAndUpdate(
      { _id: ideaId },
      { $set: { status: 4 } },
    )
    let ideas;
    ideas = await Idea.find({ status: 3 }).populate('assigned_user', ['name', 'github']).populate('proposals.user', ['name', 'github']);
    res.json(ideas);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
})

// create the new idea
router.post('/', auth, async (req, res) => {
    try {
        const { title, content, category, data } = req.body;
        const newIdea = new Idea({
            user: req.user.id,
            category,
            title,
            content,
            budget: data.budget,
            milestone: data.milestone
        });
        // const { ideaID, wallet, budget, milestone } = req.body;
        // let idea = await Idea.findOneAndUpdate(
        //   { _id: ideaID },
        //   { $set: { wallet, budget, milestone, status: 1 } },
        //   { new: true, upsert: true, setDefaultsOnInsert: true }
        // )
        const idea = await newIdea.save();
        res.json(idea);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
})

module.exports = router;
