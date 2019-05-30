const userDAO = require('./models/user-dao');

/**
 * Use cookie to remember user login
 */
class RememberMe {
    constructor(cookieMaxAge) {
        this.cookieMaxAge = cookieMaxAge;
    }

    checkCookie(req, res, next) {
        if (req.session && req.session.user) {
            console.log('User ' + req.session.user.id + ' already login.');
        } else if (req.cookies && req.cookies.rememberMe) {
            console.log('Auto login with cookie ' + req.cookies.rememberMe);
            var user = userDAO.findByID(req.cookies.rememberMe);
            if (user && user.id) {
                req.session.user = user;
            }
        }
        next();
    }

    setCookie(res, key, value) {
        res.cookie(key, value, { maxAge: this.cookieMaxAge });
    }

    clearCookie(res, key = 'rememberMe') {
        res.cookie(key, '0', { expires: new Date(Date.now() - 1) });
    }
}

module.exports = new RememberMe(24 * 60 * 60 * 1000);