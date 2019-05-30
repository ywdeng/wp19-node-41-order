const baseClass = require('./dao');
const sqlite3 = require("sqlite3").verbose();
const orderItemDAO = require('./order-item-dao');
const orderHistoryDAO = require('./order-history-dao');
const userDAO = require('./user-dao');

const DDL_ORDERS = `
CREATE TABLE IF NOT EXISTS Orders (
    id INTEGER PRIMARY KEY, 
    custName TEXT NOT NULL, 
    custTel TEXT NOT NULL,
    custAddr TEXT NOT NULL,  
    qty INTEGER NOT NULL, 
    total INTEGER NOT NULL, 
    orderDate INTEGER NOT NULL,
    userId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT "新訂單")
`;

/**
 * 訂單資料存取
 */
class OrderDAO extends baseClass.DAO {
    constructor(filename) {
        super(filename, "Orders", ["id", "custName", "custTel", "custAddr", "qty", "total", "orderDate", "userId", "status"], "id");
        var db = new sqlite3.Database(this.dataFile);
        db.serialize(() => {
            db.run(DDL_ORDERS, [], (err) => {
                if (err) throw err;
                console.log("Table " + this.tableName + " OK.");
            });
        });
    }

    /**
     * 訂單狀態名稱
     */
    get STATUS() {
        return ['新訂單', '已調製', '已出貨', '已送達', '已結清', '已取消'];
    }

    mapper(row) {
        if (row) {
            var d = {
                id: row.id,
                custName: row.custName,
                custTel: row.custTel,
                custAddr: row.custAddr,
                qty: row.qty,
                total: row.total,
                orderDate: new Date(row.orderDate),
                userId: row.userId,
                status: row.status,
                items: []
            }
            d.orderDateStr = this.dateToString(d.orderDate);
            return d;
        }
        return {};
    }

    findAll(callback) {
        var sql = "SELECT " + this.fieldList + " FROM " + this.tableName + " ORDER BY id DESC";
        var db = this.open();
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            } else {
                let list = [];
                rows.forEach(row => {
                    let entity = this.mapper(row);
                    list.push(entity);
                });
                callback(null, list);
            }
        });
        db.close();
    }

    findByID(value, callback) {
        var sql = 'SELECT ' + this.fieldList + ' FROM ' + this.tableName + ' WHERE id=?';
        var db = this.open();
        db.get(sql, [value], (err, row) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            }
            let entity = this.mapper(row);
            return callback(null, entity);
        });
        db.close();
    }

    toArrayWithoutId(entity) {
        var data = [
            entity.custName,
            entity.custTel,
            entity.custAddr,
            entity.qty,
            entity.total,
            entity.orderDate.valueOf(),
            entity.userId,
            entity.status
        ];
        return data;
    }

    toArrayWithIdLast(entity) {
        var data = [
            entity.custName,
            entity.custTel,
            entity.custAddr,
            entity.qty,
            entity.total,
            entity.orderDate.valueOf(),
            entity.userId,
            entity.status,
            entity.id
        ];
        return data;
    }

    update(entity, callback) {
        var sql = "UPDATE " + this.tableName + " SET " +
            "custName=?, custTel=?, custAddr=?, qty=?, total=?, orderDate=?, userId=?, status=? " +
            "WHERE id=?";
        var data = this.toArrayWithIdLast(entity);
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err);
                if (callback) callback(err, null);
            } else if (callback) {
                callback(null, entity);
            } else {
                console.log("Orders updates " + this.changes + " row, lastID is " + this.lastID + ".");
            }
        });
        db.close();
    }

    insert(entity, callback) {
        var sql = "INSERT INTO " + this.tableName +
            " (custName, custTel, custAddr, qty, total, orderDate, userId, status) VALUES (?,?,?,?,?,?,?,?)";
        var data = this.toArrayWithoutId(entity);
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err);
                if (callback) callback(err, null);
            } else if (callback) {
                entity.id = this.lastID;
                callback(null, entity);
            } else {
                console.log("Orders inserts " + this.changes + " row, lastID is " + this.lastID + ".");
            }
        });
        db.close();
    }

    findByUserId(userId, callback) {
        var sql = 'SELECT ' + this.fieldList + ' FROM ' + this.tableName + ' WHERE userId=? ORDER BY id DESC';
        var db = this.open();
        db.all(sql, [userId], (err, rows) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            } else {
                let list = [];
                rows.forEach(row => {
                    let entity = this.mapper(row);
                    list.push(entity);
                });
                callback(null, list);
            }
        });
        db.close();
    }

    loadItems(entity, callback) {
        orderItemDAO.findByOrderId(entity.id, (err, data) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            } else {
                entity.items = data;
                callback(null, entity);
            }
        });
    }

    loadHistory(entity, callback) {
        orderHistoryDAO.findByOrderId(entity.id, (err, data) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            } else {
                entity.history = data;
                callback(null, entity);
            }
        });
    }

    loadReceivable(callback) {
        var sql = "SELECT R.id AS orderId, R.custName, R.custTel, R.custAddr, R.qty, R.total, R.orderDate, R.userId, U.name as userName, R.status FROM " +
            this.tableName + " R INNER JOIN " + userDAO.tableName + " U ON R.userId=U.id WHERE R.status='已出貨' ORDER BY userId,orderDate";
        var db = this.open();
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            } else {
                let list = [];
                rows.forEach(row => {
                    let entity = {
                        orderId: row.orderId,
                        custName: row.custName,
                        custTel: row.custTel,
                        custAddr: row.custAddr,
                        qty: row.qty,
                        total: row.total,
                        orderDate: new Date(row.orderDate),
                        orderDateStr: this.dateToString(new Date(row.orderDate)),
                        userId: row.userId,
                        userName: row.userName,
                        status: row.status,
                    };
                    list.push(entity);
                });
                callback(null, list);
            }
        });
        db.close();
    }

    /**
     * 墊更訂單狀態
     * @param {String} orderIdList comma separated list of order ids, eg. '1,2,3'
     * @param {String} targetStatus one of the status names defined in this.STATUS
     * @param {*} callback 
     */
    updateStatus(orderIdList, targetStatus, callback) {
        var sql = "UPDATE " + this.tableName + " SET status=? WHERE id IN (" + orderIdList + ")";
        var db = this.open();
        db.run(sql, [targetStatus], function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, null);
            } else if (callback) {
                callback(null, this.changes);
            } else {
                console.log("Orders updates " + this.changes + " row(s), lastID is " + this.lastID + ".");
            }
        });
        db.close();
    }
}

module.exports = new OrderDAO("../db/order-mgr.sqlite3");