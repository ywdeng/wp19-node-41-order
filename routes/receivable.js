const express = require('express');
const createError = require('http-errors');
const router = express.Router();
const orderDAO = require('../models/order-dao');
const orderItemDAO = require('../models/order-item-dao');
const orderHistoryDAO = require('../models/order-history-dao');
const userDAO = require('../models/user-dao');
const prodSpec = require("../models/product.json");

function collectReceivables(data) {
    var list = [];
    // list distinct users
    for (let i = 0; i < data.length; i++) {
        if (!list.includes(data[i].userId)) {
            list.push(data[i].userId);
        }
    }
    var receivables = [];
    var rec = false;
    list.forEach(uid => {
        data.forEach(row => {
            if (uid == row.userId) {
                if (rec) {
                    rec.amount += row.total;
                    rec.orders.push(row);
                } else {
                    rec = {
                        userId: row.userId,
                        userName: row.userName,
                        custTel: row.custTel,
                        custAddr: row.custAddr,
                        amount: row.total,
                        orders: [row]
                    }
                }
            }
        });
        receivables.push(rec);
        rec = false;
    });
    return receivables;
}

// 列出所有的應收帳款
router.get('/', userDAO.forceLogin, (req, res, next) => {
    if (!req.session.user.isAdmin) return next(createError(401));
    orderDAO.loadReceivable((err, data) => {
        if (err) return next(createError(500));
        var viewbag = {
            user: req.session.user,
        };
        if (data && (data.length > 0)) {
            viewbag.receivables = collectReceivables(data);
            console.debug(viewbag.receivables);
        } else {
            viewbag.receivables = false;
        }
        res.render("receivable", viewbag);
    });

});

/**
 * 結清指定的訂單
 */
router.post('/payoff', userDAO.forceLogin, function (req, res, next) {
    if (req.session.user.isAdmin) {
        let orderIdList = req.body.orderIdList.split(',');
        if (orderIdList && (orderIdList.length > 0)) {
            orderDAO.updateStatus(orderIdList.join(','), '已結清', (err, data) => {
                if (err) next(createError(500));
                else {
                    console.debug("批次結清 " + data + " 筆訂單。");
                    res.redirect(req.get("Referer"));
                }
            });
        } else {
            next(createError(422));
        }
    } else {
        next(createError(401));
    }
});

module.exports = router;
