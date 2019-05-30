const baseClass = require('./dao');
const sqlite3 = require("sqlite3").verbose();
const userDAO = require('../models/user-dao');

const DDL_ORDER_HISTORY = `
CREATE TABLE IF NOT EXISTS OrderHistory (
    orderId INTEGER NOT NULL, 
    fromStatus TEXT NOT NULL, 
    toStatus TEXT NOT NULL, 
    userId INTEGER NOT NULL, 
    ctime INTEGER NOT NULL,
    note TEXT)
`;

/**
 * 訂單資料存取
 */
class OrderHistoryDAO extends baseClass.DAO {
    constructor(filename) {
        super(filename, "OrderHistory", ["orderId", "fromStatus", "toStatus", "userId", "ctime", "note"], ["rowid", "orderId"]);
        var db = new sqlite3.Database(this.dataFile);
        db.serialize(() => {
            db.run(DDL_ORDER_HISTORY, [], (err) => {
                if (err) throw err;
                console.log("Table " + this.tableName + " OK.");
            });
        });
    }

    mapper(row) {
        if (row) {
            var d = {
                /* orderId: row.orderId, */
                fromStatus: row.fromStatus,
                toStatus: row.toStatus,
                userId: row.userId,
                userName: row.userName,
                ctime: new Date(row.ctime),
                note: row.note
            }
            d.ctimeStr = this.dateToString(d.ctime);
            return d;
        }
        return {};
    }

    findByOrderId(orderId, callback) {
        var sql = "SELECT A.orderId, A.fromStatus, A.toStatus, A.userId, B.name AS userName, A.ctime, A.note FROM " +
            this.tableName + " A LEFT OUTER JOIN " + userDAO.tableName + " B ON A.userId=B.id " +
            "WHERE A.orderId=? ORDER BY A.ctime";
        var db = this.open();
        db.all(sql, [orderId], (err, rows) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            } else {
                let list = [];
                rows.forEach(row => {
                    list.push(this.mapper(row));
                });
                callback(null, list);
            }
        });
        db.close();
    }

    deleteByOrderId(orderId, callback) {
        var sql = "DELETE FROM " + this.tableName + " WHERE orderId=?";
        var db = this.open();
        db.run(sql, [orderId], function (err) {
            if (err) {
                console.error(err);
                if (callback) callback(err, null);
            } else if (callback) {
                callback(null, this.changes);
            } else {
                console.log("OrderHistory deletes " + this.changes + " row.");
            }
        });
        db.close();
    }

    toArrayWithoutId(entity) {
        var data = [
            entity.orderId,
            entity.fromStatus,
            entity.toStatus,
            entity.userId,
            entity.ctime.valueOf(),
            entity.note
        ];
        return data;
    }

    insert(entity, callback) {
        var sql = "INSERT INTO " + this.tableName + " VALUES (?,?,?,?,?,?)";
        var data = this.toArrayWithoutId(entity);
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err);
                if (callback) callback(err, 0);
            } else if (callback) {
                callback(null, this.changes);
            } else {
                console.log("OrderHistory inserts " + this.changes + " row.");
            }
        });
        db.close();
    }
}

module.exports = new OrderHistoryDAO("../db/order-mgr.sqlite3");