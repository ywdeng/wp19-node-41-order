const express = require('express');
const createError = require('http-errors');
const router = express.Router();
const orderDAO = require('../models/order-dao');
const orderItemDAO = require('../models/order-item-dao');
const orderHistoryDAO = require('../models/order-history-dao');
const userDAO = require('../models/user-dao');
const prodSpec = require("../models/product.json");

function filterOrderStatus(list, excludeStatus) {
    var filtered = [];
    for (let i = 0; i < list.length; i++) {
        if (list[i].status == excludeStatus) continue;
        filtered.push(list[i]);
    }
    return filtered;
}

function sendOrderList(req, res, orderList) {
    var viewbag = {
        user: req.session.user,
        statusClosed: '已結清',
        statusCanceled: '已取消',
        includeClosed: (req.query.includeClosed ? req.query.includeClosed : false),
        includeCanceled: (req.query.includeCanceled ? req.query.includeCanceled : false),
    };
    if (!viewbag.includeClosed) {
        orderList = filterOrderStatus(orderList, viewbag.statusClosed);
    }
    if (!viewbag.includeCanceled) {
        orderList = filterOrderStatus(orderList, viewbag.statusCanceled);
    }
    viewbag.orders = (orderList && (orderList.length > 0)) ? orderList : false;
    res.render("order", viewbag);
}

// 列出所有的訂單
router.get('/', userDAO.forceLogin, (req, res, next) => {
    if (req.session.user.isAdmin) {
        orderDAO.findAll((err, data) => {
            if (err) return next(createError(500));
            sendOrderList(req, res, data);
        });
    } else {
        orderDAO.findByUserId(req.session.user.id, (err, data) => {
            if (err) return next(createError(500));
            sendOrderList(req, res, data);
        });
    }
});

// 顯示指定的訂單 
router.get('/:id', userDAO.forceLogin, (req, res, next) => {
    var viewbag = { user: req.session.user, STATUS_OPTIONS: orderDAO.STATUS };
    orderDAO.findByID(req.params.id, (err, data) => {
        if (err) return next(createError(500));
        if (data && data.id) {
            if (!req.session.user.isAdmin && (data.userId != req.session.user.id)) {
                return next(createError(401)); //Unauthorized
            }
            orderDAO.loadItems(data, (err1, data1) => {
                if (err1) return next(createError(500));
                orderDAO.loadHistory(data1, (err2, data2) => {
                    if (err2) return next(createError(500));
                    viewbag.order = data2;
                    return res.render("order-detail", viewbag);
                });
            });
        } else {
            next(createError(404));
        }
    });
});

function createOrder(req) {
    var list = [];
    for (var i = 0; i < prodSpec.products.length; i++) {
        var id = prodSpec.products[i].id;
        var item = {};
        if (req.body[id + "Sum"] > 0) {
            item.name = prodSpec.products[i].name;
            item.size = "小杯(S)";
            if (req.body[id + "Size"] == "M") {
                item.size = "中杯(M)"
            } else if (req.body[id + "Size"] == "L") {
                item.size = "大杯(L)";
            } else if (req.body[id + "Size"] == "XL") {
                item.size = "特大杯(XL)";
            }
            item.price = Number(req.body[id + "Price"]);
            item.qty = Number(req.body[id + "Qty"]);
            item.sum = Number(req.body[id + "Sum"]);
            item.note = "";
            if (req.body[id + "Ice"] == "1")
                item.note = "少冰 ";
            else if (req.body[id + "Ice"] == "2")
                item.note = "去冰 ";

            if (req.body[id + "Sugar"] == "1")
                item.note += "減糖";
            else if (req.body[id + "Sugar"] == "2")
                item.note += "微糖";
            else if (req.body[id + "Sugar"] == "3")
                item.note += "無糖";

            if (item.note == "") item.note = "正常";
            list.push(item);
        }
    }
    var ordr = {
        custName: req.body.custName,
        custTel: req.body.custTel,
        custAddr: req.body.custAddr,
        qty: req.body.Quantity,
        total: req.body.Total,
        orderDate: new Date(),
        status: orderDAO.STATUS[0],
        items: list
    };
    return ordr;
}

// 建立新訂單
router.post("/", function (req, res, next) {
    var order = createOrder(req);
    if (req.session && req.session.user) {
        // user place order after login
        order.userId = req.session.user.id;
        orderDAO.insert(order, (err, data) => {
            if (err) {
                console.error(err);
                return next(createError(500));
            }
            if (order.items && (order.items.length > 0)) {
                orderItemDAO.insertWithOrderId(data.id, order.items, (err1, count) => {
                    if (err1) {
                        console.error(err1);
                        return next(createError(500));
                    }
                });
            }
            res.redirect("/order/" + data.id);
        });
    } else {
        order.userId = userDAO.tel2ID(order.custTel); // 電話號碼就是帳號
        // 先儲存訂單 
        orderDAO.insert(order, (err, entity) => {
            if (err) return console.error(err);
            order.id = entity.id;
            orderItemDAO.insertWithOrderId(order.id, order.items, (err1) => {
                if (err1) return console.error(err1);
            });
            userDAO.findByID(order.userId, (err2, user) => {
                if (err2) return console.error(err2);
                req.session.pageAfterLogin = "/order/" + order.id;
                if (user && user.id) {
                    // 請舊用戶登入
                    req.session.loginUser = user;
                    res.redirect('/login');
                } else {
                    // 建立新帳號
                    req.session.newUser = {
                        id: order.userId,
                        name: order.custName,
                        tel: order.custTel,
                        addr: order.custAddr,
                        isAdmin: false
                    };
                    res.redirect('/user/new');
                }
            });
        });
    }
});


// 更改訂單狀態
router.post("/status", userDAO.forceLogin, function (req, res, next) {
    if ((!req.session.user.isAdmin) && (req.body.orderUserId != req.session.user.id))
        return next(createError(401));
    var entity = {
        orderId: req.body.orderId,
        fromStatus: req.body.originalStatus,
        toStatus: req.body.targetStatus,
        userId: req.session.user.id,
        ctime: new Date(),
        note: (req.body.note ? req.body.note : "")
    }
    orderHistoryDAO.insert(entity, (err, data) => {
        if (err) return next(createError(500));
        orderDAO.findByID(req.body.orderId, (err1, data1) => {
            if (err1) return next(createError(500));
            if (data1 && data1.id) {
                data1.status = req.body.targetStatus;
                orderDAO.update(data1, (err2, data2) => {
                    if (err2) return next(createError(500));
                    res.redirect("/order/" + data2.id);
                });
            } else {
                return next(createError(500));
            }
        });
    });
});

module.exports = router;
