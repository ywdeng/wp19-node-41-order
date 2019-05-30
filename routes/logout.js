var express = require('express');
var router = express.Router();
const rememberMe = require('../remember-me');
const sessionDAO = require('../models/session-dao');

router.get('/', function (req, res, next) {
    // destroy session
    if (req.session) {
        // delete session
        if (req.session.user && req.session.user.session) {
            sessionDAO.closeSession(req.session.user.session);
        } else {
            sessionDAO.closeSession({ sessionID: req.sessionID });
        }
        req.session.destroy((err) => {
            if (err) return next(err);
            return res.redirect('/');
        });
    }
    // destroy cookie
    if (req.cookies && req.cookies.rememberMe) {
        rememberMe.clearCookie(res);
    }
    sessionDAO.cleanup();
});

module.exports = router;