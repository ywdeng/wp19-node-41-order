const baseClass = require('./dao');
const sqlite3 = require("sqlite3").verbose();

const DDL_SESSIONS = `
CREATE TABLE IF NOT EXISTS Sessions (
    sessionID TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL, 
    userName TEXT NOT NULL, 
    remoteAddress TEXT NOT NULL, 
    login INTEGER NOT NULL, 
    lastTouch INTEGER NOT NULL, 
    logout INTEGER NOT NULL DEFAULT 0)
`;

/**
 * 帳號資料存取
 */
class SessionDAO extends baseClass.DAO {
    constructor(filename) {
        super(filename, "Sessions", ["sessionID", "userId", "userName", "remoteAddress", "login", "lastTouch", "logout"], "sessionID");
        var db = new sqlite3.Database(this.dataFile);
        db.serialize(() => {
            db.run(DDL_SESSIONS, [], (err) => {
                if (err) throw err;
                console.log("Table " + this.tableName + " OK.");
            });
        });
    }

    get sessionTimeout() {
        return Number(1800000); /* 30 minutes */
    }

    get checkPeriod() {
        return Number(28800000); /* prune expired entries every 8h */
    }

    mapper(row) {
        if (row) {
            return {
                sessionID: row.sessionID,
                userId: row.userId,
                userName: row.userName,
                remoteAddress: row.remoteAddress,
                login: new Date(row.login),
                lastTouch: new Date(row.lastTouch),
                logout: ((row.logout > 0) ? new Date(row.logout) : false)
            }
        }
        return {};
    }

    toArrayWithoutLogout(entity) {
        var data = [
            entity.sessionID,
            entity.userId,
            entity.userName,
            entity.remoteAddress,
            entity.login.valueOf(),
            entity.lastTouch.valueOf()
        ];
        return data;
    }

    findAll(callback) {
        var sql = "SELECT " + this.fieldList + " FROM " + this.tableName + " ORDER BY logout, lastTouch DESC, userId";
        var db = this.open();
        db.all(sql, [], (err, rows) => {
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

    findByID(value, callback) {
        var sql = 'SELECT ' + this.fieldList + ' FROM ' + this.tableName + ' WHERE sessionID=?';
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

    countOpened(callback) {
        var sql = 'SELECT COUNT(DISTINCT userId) AS NUM FROM ' + this.tableName + ' WHERE logout < 1';
        var db = this.open();
        db.get(sql, [], (err, row) => {
            if (err) {
                console.error(err);
                return callback(err, null);
            }
            let num = parseInt(row.NUM);
            return callback(null, num);
        });
        db.close();
    }

    openSession(entity, callback) {
        entity.lastTouch = new Date();
        var sql = "INSERT INTO " + this.tableName + " VALUES (?,?,?,?,?,?,0)";
        var data = this.toArrayWithoutLogout(entity);
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, null);
            } else if (callback) {
                entity.rowid = this.lastID;
                callback(null, entity);
            } else {
                console.log("Session opened by " + entity.userId + " " + entity.userName + " with session ID " + entity.sessionID);
            }
        });
        db.close();
    }

    closeSession(entity, callback) {
        var sql = "UPDATE " + this.tableName + " SET logout=? WHERE sessionID=?";
        entity.lastTouch = new Date();
        entity.logout = new Date();
        var data = [entity.logout.valueOf(), entity.sessionID];
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, null);
            } else if (callback) {
                entity.rowid = this.lastID;
                callback(null, entity);
            } else {
                console.log("Session closed by " + entity.userId + " " + entity.userName + " with session ID " + entity.sessionID);
            }
        });
        db.close();
    }

    touch(entity, callback) {
        var sql = "UPDATE " + this.tableName + " SET lastTouch=? WHERE sessionID=?";
        entity.lastTouch = new Date();
        var data = [entity.lastTouch.valueOf(), entity.sessionID];
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, null);
            } else if (callback) {
                entity.rowid = this.lastID;
                callback(null, entity);
            } else {
                console.log("Session touched by " + entity.userId + " " + entity.userName + " with session ID " + entity.sessionID);
            }
        });
        db.close();
    }

    /**
     * Clean up obsolete sessions
     * @param {*} callback 
     */
    cleanup(callback) {
        var closePeriod = Date.now() - this.sessionTimeout;
        var deletePeriod = Date.now() - this.checkPeriod;
        var sql = "UPDATE " + this.tableName + " SET logout=? WHERE lastTouch<?";
        var db = this.open();
        db.run(sql, [Date.now(), closePeriod], function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, 0);
            } else {
                console.log("Closes " + this.changes + " session(s).");
                sql = "DELETE FROM Sessions WHERE lastTouch<?";
                db.run(sql, [deletePeriod], function (err1) {
                    if (err1) {
                        console.error(err1)
                        if (callback) callback(err1, 0);
                    } else if (callback) {
                        callback(null, 0);
                    } else {
                        console.log("Deletes " + this.changes + " session(s).");
                    }
                });
            }
        });
        db.close();
    }
}

module.exports = new SessionDAO("../db/order-mgr.sqlite3");