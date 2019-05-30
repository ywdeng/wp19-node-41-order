var express = require('express');
var router = express.Router();
const userDAO = require('../models/user-dao');
const sessionDAO = require('../models/session-dao');
const createError = require('http-errors');

/**
 * count current sessions
 */
router.get('/sessionCount', function (req, res, next) {
    if (req.session && req.session.user && req.session.user.session) {
        sessionDAO.touch(req.session.user.session, (err, entity) => {
            if (!err) {
                req.session.user.session = entity;
            }
        });
    }
    sessionDAO.countOpened((err, num) => {
        if (err) next(createError(500));
        else {
            res.json({ sessionCount: num });
        }
    });
});

module.exports = router;
