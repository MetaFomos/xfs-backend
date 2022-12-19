const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const normalize = require("normalize-url");
const gravatar = require("gravatar");
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');

/* OAuth2.0 Required Packages */
const { OAuth2Client } = require("google-auth-library");
const glClient = new OAuth2Client(
  "255335071356-qqfb9le0dio476c0mib60o1lkhfl0dce.apps.googleusercontent.com"
);

// @route    GET api/auth
// @desc     Get user by token
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post(
  "/login",
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ errors: [{ msg: "User not found." }] });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Password incorrect." }] });
      }

      const payload = {
        user: {
          id: user.id,
          role: user.role
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 7200 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );

      console.log("___ User login: " + user.email);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

router.post(
  "/register",
  check("email", "Please include a valid email").isEmail(),
  check("userName", "Please include a username").exists(),
  check("gitName", "Please include a Github username").exists(),
  check(
    "password",
    "Please enter a password with 4 or more characters"
  ).isLength({ min: 4 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userName, email, password, gitName } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      const avatar = normalize(
        gravatar.url(email, {
          s: "200",
          r: "pg",
          d: "mm",
        }),
        { forceHttps: true }
      );

      user = new User({
        name: userName,
        email,
        password,
        github: gitName
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();
      console.log("__New User added." + Date("Y-m-d"));

      const payload = {
        user: {
          id: user.id,
          role: user.role
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 7200 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

/* SOCIAL MEDIA (SM) USER SIGNUP */
async function verifyInGoogle(token) {
  const ticket = await glClient.verifyIdToken({
    idToken: token,
    audience:
      "860538264827-8qf2qpp6mqki8asmbpsroulb9u16un61.apps.googleusercontent.com", // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();
  return payload;
  // If request specified a G Suite domain:
  // const domain = payload['hd'];
}

router.post(
  "/sm-signup",
  check("register_type", "Please include a valid signup type").exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const register_type = req.body.register_type;
    let verifiedToken,
      google_auth_user_id,
      fb_auth_user_id,
      picture,
      email,
      name;

    try {
      if (register_type == "GOOGLE") {
        const tokenId = req.body.tokenObj.id_token;
        verifiedToken = await verifyInGoogle(tokenId);
        google_auth_user_id = verifiedToken.sub;
        picture = verifiedToken.picture;
        name = verifiedToken.name;
        email = verifiedToken.email;
      } 

      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      const avatar = normalize(picture, { forceHttps: true });
      const firstname = name.split(" ")[0] || null;
      const lastname = name.split(" ")[1] || null;

      user = new User({
        email,
        name: firstname + ' ' + lastname,
        register_type,
        google_auth_user_id,
      });

      await user.save();
      console.log("__New User added." + Date("Y-m-d"));

      const payload = {
        user: {
          id: user._id,
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 7200 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
