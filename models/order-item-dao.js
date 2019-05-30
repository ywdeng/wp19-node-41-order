const baseClass = require('./dao');
const sqlite3 = require("sqlite3").verbose();

const DDL_ORDER_ITEMS = `
CREATE TABLE IF NOT EXISTS OrderItems (
    orderId INTEGER NOT NULL, 
    name TEXT NOT NULL, 
    size TEXT NOT NULL, 
    price INTEGER NOT NULL, 
    qty INTEGER NOT NULL, 
    sum INTEGER NOT NULL,
    note TEXT)
`;

/**
 * 訂單資料存取
 */
class OrderItemDAO extends baseClass.DAO {
    constructor(filename) {
        super(filename, "OrderItems", ["orderId", "name", "size", "price", "qty", "sum", "note"], ["rowid", "orderId"]);
        var db = new sqlite3.Database(this.dataFile);
        db.serialize(() => {
            db.run(DDL_ORDER_ITEMS, [], (err) => {
                if (err) throw err;
                console.log("Table " + this.tableName + " OK.");
            });
        });
    }

    mapper(row) {
        if (row) {
            return {
                /* orderId: row.orderId, */
                name: row.name,
                size: row.size,
                price: row.price,
                qty: row.qty,
                sum: row.sum,
                note: row.note
            }
        }
        return {};
    }

    findByOrderId(orderId, callback) {
        var sql = "SELECT " + this.fieldList + " FROM " + this.tableName + " WHERE orderId=? ";
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

    toArrayWithoutId(entity) {
        var data = [
            entity.orderId,
            entity.name,
            entity.size,
            entity.price,
            entity.qty,
            entity.sum,
            entity.note

        ];
        return data;
    }

    insert(entity, callback) {
        var sql = "INSERT INTO " + this.tableName + " VALUES (?,?,?,?,?,?,?)";
        var data = this.toArrayWithoutId(entity);
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, 0);
            } else if (callback) {
                callback(null, this.changes);
            } else {
                console.log("OrderItems inserts " + this.changes + " rows.");
            }
        });
        db.close();
    }

    insertWithOrderId(orderId, entities, callback) {
        var sql = "INSERT INTO " + this.tableName + " VALUES (?,?,?,?,?,?,?)";
        var db = this.open();
        var count = 0;
        entities.forEach(e => {
            e.orderId = orderId;
            let data = this.toArrayWithoutId(e);
            db.run(sql, data, (err) => {
                if (err) {
                    console.error(err)
                    if (callback) callback(err, 0);
                } else {
                    count++;
                }
            });
        });
        if (callback) {
            callback(null, count);
        } else {
            console.log(this.tableName + " inserts " + count + " rows.");
        }
        db.close();
    }
}

module.exports = new OrderItemDAO("../db/order-mgr.sqlite3");