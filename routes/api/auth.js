const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const normalize = require("normalize-url");
const gravatar = require("gravatar");
const config = require('config');
const md5 = require('md5');
const { check, validationResult } = require('express-validator');
const axios = require('axios');
var qs = require('qs');

const User = require('../../models/User');

/* OAuth2.0 Required Packages */
const { OAuth2Client } = require("google-auth-library");
const glClient = new OAuth2Client(
  "255335071356-qqfb9le0dio476c0mib60o1lkhfl0dce.apps.googleusercontent.com"
);

router.get('/test', async (req, res) => {
  res.json({ msg: 'success' });
});

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

router.post('/editProfile', auth, async (req, res) => {
  try {
    console.log(req.files);
    const user = await User.findById(req.user.id);
    if(req.files) {
      var files = [].concat(req.files['files[]']);
      for(var i = 0; i < files.length; i++){
        var file = files[i];
        // file.name = file.name.replace(/\s/g, '');
        //hash image name
        let tempHashName = md5(Date.now());
        //hash image name end
        //file extension
        let tempFileExt = file.name.substring(file.name.lastIndexOf('.')+1, file.name.length) || file.name;
        //file extension end
  
        console.log(tempFileExt);
  
        try {
          // if(dashboard.partnership_img[updatedIndex].hash_name) {
          //   // await fs.unlinkSync(`D:/work/2022.10.6 (Legends)/legends-frontend/src/assets/images/upload/${dashboard.dashboard_img}`);
          //   await fs.unlinkSync(`D:/work/2022.10.6 (Legends)/legends-frontend/src/assets/images/upload/${dashboard.partnership_img[updatedIndex].hash_name}`);
          // }
          
          user.avatar = tempHashName+'.'+tempFileExt;
        } catch (err) {
          console.error(err.message);
          res.status(500).send('Server Error');
        }
  
        file.mv(`../xfs-frontend/public/assets/img/./${tempHashName}.${tempFileExt}`, err => {
          if(err) {
            console.error(err);
            return res.status(500).send(err);
          }
        });
      }
    }
    const { userName, gitName, email } = req.body;
    user.name = userName;
    user.email = email;
    user.github = gitName;
    await user.save();
    res.status(200).send({ msg: 'success' });
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error');
  }
})

router.post('/changePassword', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { curPassword, resetPassword } = req.body;
    if (await bcrypt.hash(curPassword, user.salt) == user.password) {
      const salt = await bcrypt.genSalt(10);
      user.salt = salt;
      user.password = await bcrypt.hash(resetPassword, salt);
      user.save();
      res.status(200).send({ msg: 'success' });
    } else {
      res.status(500).send('Current password incorrect');
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error');
  }
})

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
      
      user.salt = salt;
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
      "255335071356-qqfb9le0dio476c0mib60o1lkhfl0dce.apps.googleusercontent.com", // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();
  return payload;
  // If request specified a G Suite domain:
  // const domain = payload['hd'];
}

router.post(
  "/sm-login",
  check("accessToken", "Please include a valid token").exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accessToken } = req.body;
    const { email } = req.body.profileObj;
    try {
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ errors: [{ msg: "User not found." }] });
      }

      let OAuth2UserId;
      if (user.register_type == "GOOGLE") {
        const tokenId = req.body.tokenObj.id_token;
        verifiedToken = await verifyInGoogle(tokenId).catch(console.error);
        OAuth2UserId = verifiedToken.sub;

        if (OAuth2UserId != user.google_auth_user_id) {
          return res
            .status(400)
            .json({ errors: [{ msg: "User not registred." }] });
        }
      } 

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

      console.log("___ User login: " + user.email);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

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

      const firstname = name.split(" ")[0] || null;
      const lastname = name.split(" ")[1] || null;

      user = new User({
        email,
        name: firstname + ' ' + lastname,
        register_type,
        google_auth_user_id,
        avatar: picture
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

router.post('/githubAuth_signup', async (req, res) => {
  const { code } = req.body;
  
  axios({
    method: 'post',
    url: 'https://github.com/login/oauth/access_token',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data : qs.stringify({
      'client_id': config.get('gitClientId'),
      'client_secret': config.get('gitClientSecret'),
      'code': code,
      'redirect_uri': config.get('gitRedirectUrl') 
    })
  })
  .then(function (response) {
    let params = new URLSearchParams(response.data);
    const access_token = params.get("access_token");
    console.log(params, access_token);

    axios({
      method: 'get',
      url: 'https://api.github.com/user',
      headers: { 
        'Authorization': 'Bearer '+access_token
      }
    })
      .then(async function (response_user) {
        // console.log(response_user);
        var github_user_data = response_user.data;
        var githubUserName = github_user_data['login'];
        var githubUserAvatar = github_user_data['avatar_url'];
        console.log(githubUserName, githubUserAvatar);
        // check sigh in or sign up
        let user = await User.findOne({ github: githubUserName });

        if (user) {
          return res
            .status(400)
            .json({ errors: [{ msg: "User already exists" }] });
        }

        user = new User({
          github: githubUserName,
          register_type: 'Gitbub',
          avatar: githubUserAvatar
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
      })
      .catch(function (error) {
        console.log(error);
        return res
          .status(400)
          .json({ errors: [{ msg: "Github login failed" }] });
      });
  })
  .catch(function (error) {
    // console.log(error);
    return res
          .status(400)
          .json({ errors: [{ msg: "Github login failed" }] });
  });
})

router.post('/githubAuth_signin', async (req, res) => {
  const { code } = req.body;
  
  axios({
    method: 'post',
    url: 'https://github.com/login/oauth/access_token',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data : qs.stringify({
      'client_id': config.get('gitClientId'),
      'client_secret': config.get('gitClientSecret'),
      'code': code,
      'redirect_uri': config.get('gitRedirectUrl') 
    })
  })
  .then(function (response) {
    let params = new URLSearchParams(response.data);
    const access_token = params.get("access_token");

    axios({
      method: 'get',
      url: 'https://api.github.com/user',
      headers: { 
        'Authorization': 'Bearer '+access_token
      }
    })
      .then(async function (response_user) {
        var github_user_data = response_user.data;
        var githubUserName = github_user_data['login'];
        var githubUserAvatar = github_user_data['avatar_url'];
        // check sigh in or sign up
        let user = await User.findOne({ github: githubUserName });

        if (!user) {
          return res.status(400).json({ errors: [{ msg: "User not found." }] });
        }

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

        console.log("___ User login: " + user.github);
      })
      .catch(function (error) {
        // console.log(error);
        return res
          .status(400)
          .json({ errors: [{ msg: "Github login failed" }] });
      });
  })
  .catch(function (error) {
    // console.log(error);
    return res
          .status(400)
          .json({ errors: [{ msg: "Github login failed" }] });
  });
})


router.post('/avatarImgSaveAction', async (req, res) => {
  try {
    var files = [].concat(req.files['files[]']);
    for(var i = 0; i < files.length; i++){
      var file = files[i];
      // file.name = file.name.replace(/\s/g, '');
      //hash image name
      let tempHashName = md5(Date.now());
      //hash image name end
      //file extension
      let tempFileExt = file.name.substring(file.name.lastIndexOf('.')+1, file.name.length) || file.name;
      //file extension end

      console.log(tempFileExt);

      file.mv('../legends-frontend/src/assets/images/upload/./main_background.jpg', err => {
        if(err) {
          console.error(err);
          return res.status(500).send(err);
        }
      });
    }
    res.json({ status: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
