const express = require('express');
const router = express.Router();
const userDAO = require('../models/user-dao');
const sessionDAO = require('../models/session-dao');
const rememberMe = require('../remember-me');

router.get('/', function (req, res, next) {
    var pageAfterLogin = false;
    var user = false;
    if (req.session) {
        if (req.session.pageAfterLogin) {
            pageAfterLogin = req.session.pageAfterLogin;
        }
        if (req.session.loginUser) {
            user = req.session.loginUser;
        }
        req.session.destroy((err) => {
            if (err) console.log(err);
        });
    }
    var viewbag = { pageAfterLogin: pageAfterLogin, account: (user ? user.id : false) };
    res.render('login', viewbag);
});

router.post('/', function (req, res, next) {
    if (req.body.account && req.body.passwd) {
        id = userDAO.tel2ID(req.body.account); // user may use tel no instead of id
        userDAO.authenticate(id, req.body.passwd, (err, user) => {
            if (err) {
                var viewbag = { account: req.body.account, errMsg: err.message + "，請重新登入：" };
                if (req.body.pageAfterLogin) {
                    viewbag.pageAfterLogin = req.body.pageAfterLogin;
                }
                return res.render('login', viewbag);
            } else {
                req.session.user = user;
                req.session.user.session = {
                    sessionID: req.sessionID,
                    userId: user.id,
                    userName: user.name,
                    remoteAddress: req.connection.remoteAddress,
                    login: new Date(),
                    lastTouch: new Date()
                };
                
                sessionDAO.openSession(req.session.user.session, (err, entity) => {
                    if (err) console.error(err);
                    else {                        
                        req.session.user.session = entity;
                    }
                });
              
                if (req.body.rememberMe) {
                    rememberMe.setCookie(res, 'rememberMe', user.id);
                }
                if (req.body.pageAfterLogin) {
                    res.redirect(req.body.pageAfterLogin);
                } else {
                    res.redirect("/");
                }
            }
        });
        sessionDAO.cleanup();
    } else {
        res.render('/login');
    }
});

module.exports = router;