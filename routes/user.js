const express = require('express');
const router = express.Router();
const userDAO = require('../models/user-dao');
const sessionDAO = require('../models/session-dao');
const createError = require('http-errors');

/**
 * 列出所有的帳號
 */
router.get('/', userDAO.forceLogin, (req, res, next) => {
    var viewbag = { user: req.session.user };
    if (req.session.user.isAdmin) {
        userDAO.findAll((err, data) => {
            if (err) return next(createError(500));
            viewbag.userList = data;
            res.render("user", viewbag);
        });
    } else {
        next(createError(401)); // unauthorized
    }
});

/**
 * create a new user
 */
router.get('/new', function (req, res, next) {
    var pageAfterLogin = false;
    var user = false;
    if (req.session) {
        if (req.session.newUser) {
            user = req.session.newUser;
        }
        if (req.session.pageAfterLogin) {
            pageAfterLogin = req.session.pageAfterLogin;
        }
        req.session.destroy((err) => {
            if (err) console.log(err);
        });
    }
    var viewbag = {
        pageAfterLogin: pageAfterLogin,
        account: (user ? user.id : false),
        name: (user ? user.name : false),
        tel: (user ? user.tel : false),
        addr: (user ? user.addr : false)
    };
    res.render('user-new', viewbag);
});

/**
 * 顯示指定的 user 
 */
router.get('/:id', userDAO.forceLogin, (req, res, next) => {
    var viewbag = { user: req.session.user };
    if (!req.session.user.isAdmin && (req.params.id != req.session.user.id)) {
        return next(createError(401)); //Unauthorized 只有管理員可以編輯別人的用戶資料
    }
    userDAO.findByID(req.params.id, (err, data) => {
        if (err) {
            console.error(err);
            return next(createError(500));
        }
        if (data && data.id) {
            viewbag.account = data.id;
            viewbag.name = data.name;
            viewbag.tel = data.tel;
            viewbag.addr = data.addr;
            viewbag.isAdmin = data.isAdmin;
            return res.render("user-edit", viewbag);
        } else {
            next(createError(404));
        }
    });
});

/**
 * create a new user
 */
router.post('/', function (req, res, next) {
    var user = {
        id: req.body.account,
        name: req.body.custName,
        tel: req.body.tel,
        addr: req.body.addr,
        password: req.body.passwd,
        isAdmin: false
    };
    userDAO.insert(user, (err, user) => {
        if (err) return next(createError(500));
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
        if (req.body.pageAfterLogin) {
            return res.redirect(req.body.pageAfterLogin);
        } else {
            res.redirect("/");
        }
    });
});

/**
 * edit user data
 */
router.post('/edit', userDAO.forceLogin, function (req, res, next) {
    var user = {
        id: req.body.account,
        name: req.body.custName,
        tel: req.body.tel,
        addr: req.body.addr,
        isAdmin: (req.body.isAdmin && (req.body.isAdmin == "1"))
    };
    if (req.body.changePassword) {
        user.password = req.body.passwd;
    }
    userDAO.update(user, (err, data) => {
        if (err) return next(createError(500));
        if (req.session.user.id == data.id) {
            req.session.user = data; // update user data in session
        }
        if (req.body.pageAfterLogin) {
            return res.redirect(req.body.pageAfterLogin);
        } else if (req.session.user.isAdmin) {
            res.redirect("/user");
        } else {
            res.redirect("/");
        }
    });
});

/**
 * delete a user
 */
router.post('/delete', userDAO.forceLogin, function (req, res, next) {
    if (req.session.user.isAdmin) {
        userDAO.findByID(req.body.userId, (err, data) => {
            if (err) return next(createError(500));
            if (data && data.id) {
                userDAO.delete(data, (err1, data1) => {
                    if (err1) return next(createError(500));
                    res.redirect(req.get("Referer"));
                });
            } else {
                return next(createError(404));
            }
        });

    } else {
        next(createError(401));
    }
});

module.exports = router;
