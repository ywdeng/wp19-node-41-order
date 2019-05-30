const baseClass = require('./dao');
const crypto = require('crypto');
const sqlite3 = require("sqlite3").verbose();
const sessionDAO = require('../models/session-dao');

const DDL_USERS = `
CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY, 
    name TEXT NOT NULL, 
    tel TEXT NOT NULL, 
    addr TEXT NOT NULL, 
    password TEXT NOT NULL, 
    isAdmin INTEGER NOT NULL DEFAULT 0)
`;

/**
 * 帳號資料存取
 */
class UserDAO extends baseClass.DAO {
    constructor(filename) {
        super(filename, "Users", ["id", "name", "tel", "addr", "password", "isAdmin"], "id");
        var db = new sqlite3.Database(this.dataFile);
        db.serialize(() => {
            db.run(DDL_USERS, [], (err) => {
                if (err) throw err;
                console.log("Table " + this.tableName + " OK.");
            });
            db.get("SELECT COUNT(*) AS NUM FROM " + this.tableName, [], (err, row) => {
                if (err) throw err;
                let num = Number(row.NUM);
                if (num === 0) {
                    console.log(this.tableName + " create an administrator account for empty table.");
                    this.insert({
                        id: "0000000000",
                        name: "店長",
                        tel: "02-8662-1688",
                        addr: "台北市羅斯福路六段218號10樓",
                        password: "1qaz@WSX",
                        isAdmin: true
                    });
                }
            });
        });
    }

    mapper(row) {
        if (row) {
            return {
                id: row.id,
                name: row.name,
                tel: row.tel,
                addr: row.addr,
                password: row.password,
                isAdmin: (row.isAdmin == 1)
            }
        }
        return {};
    }

    findAll(callback) {
        var sql = "SELECT " + this.fieldList + " FROM " + this.tableName + " ORDER BY id";
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
            entity.name,
            entity.tel,
            entity.addr,
            entity.password,
            (entity.isAdmin ? 1 : 0)
        ];
        return data;
    }

    toArrayWithId(entity) {
        var data = [
            entity.id,
            entity.name,
            entity.tel,
            entity.addr,
            entity.password,
            (entity.isAdmin ? 1 : 0)
        ];
        return data;
    }

    toArrayWithIdLast(entity) {
        var data = [
            entity.name,
            entity.tel,
            entity.addr,
            entity.password,
            (entity.isAdmin ? 1 : 0),
            entity.id
        ];
        return data;
    }

    update(entity, callback) {
        var sql = "UPDATE " + this.tableName + " SET name=?, tel=?, addr=?, isAdmin=? WHERE id=?";
        var data = [entity.name, entity.tel, entity.addr, entity.isAdmin, entity.id];
        if (entity.password) { // 更新資料包含改密碼            
            entity.password = this.passwordHash(entity.id, entity.password);
            sql = "UPDATE " + this.tableName + " SET name=?, tel=?, addr=?, password=?, isAdmin=? WHERE id=?";
            data = [entity.name, entity.tel, entity.addr, entity.password, entity.isAdmin, entity.id];
        }
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                consolr.error(err);
                if (callback) callback(err, null);
            } else if (callback) {
                callback(null, entity);
            } else {
                console.log("Users updates " + this.changes + " row(s).");
            }
        });
        db.close();
    }

    /**
     * 增加使用者
     * @param {*} entity 新使用者
     */
    insert(entity, callback) {
        entity.password = this.passwordHash(entity.id, entity.password);
        var sql = "INSERT INTO " + this.tableName + " VALUES (?,?,?,?,?,?)";
        var data = this.toArrayWithId(entity);
        var db = this.open();
        db.run(sql, data, function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, null);
            } else if (callback) {
                entity.rowid = this.lastID;
                callback(null, entity);
            } else {
                console.log("Users inserts " + this.changes + " row, lastID is " + this.lastID + ".");
            }
        });
        db.close();
    }

    delete(entity, callback) {
        var sql = "DELETE FROM " + this.tableName + " WHERE id=?";
        var db = this.open();
        db.run(sql, [entity.id], function (err) {
            if (err) {
                console.error(err)
                if (callback) callback(err, 0);
            } else if (callback) {
                callback(null, this.changes);
            } else {
                console.log("Users deletes " + this.changes + " row.");
            }
        });
        db.close();
    }

    /**
     * 將電話號碼轉換成 ID：只取數字，去除 ()-+，前置補 0，長度 10 碼
     * @param {*} tel 
     */
    tel2ID(tel) {
        var id = '';
        var n = tel.match(/\d+/g); // extract digits
        if (n) {
            id = Array.isArray(n) ? n.join('') : n;
        }
        if (id.length < 10) {
            id = "00000000000" + id;
        }
        id = id.substr(id.length - 10);
        return id;
    }

    /**
     * 建立用戶密碼的雜湊值
     * @param {*} userId 
     * @param {*} passwordPlaintext 
     */
    passwordHash(userId, passwordPlaintext) {
        var hash = crypto.createHash('sha256');
        var salted = userId + passwordPlaintext;
        hash.update(salted);
        var cipher = hash.digest('hex');
        return cipher;
    }

    /**
     * 驗證帳號密碼
     * @param {*} id 帳號
     * @param {*} passwd 密碼
     * @param {*} callback 後續處理函式
     */
    authenticate(id, passwd, callback) {
        this.findByID(id, (err, u) => {
            if (err) return callback(err);
            let pwd = this.passwordHash(id, passwd);
            if (u && u.password && (pwd === u.password)) {
                return callback(null, u);
            }
            return callback(new Error("帳號或密碼錯誤!"));
        });
    }

    /**
     * 進入受管制的頁面前，強制用戶登入
     * @param {*} req Request
     * @param {*} res Response
     * @param {*} next Next
     */
    forceLogin(req, res, next) {
        if (req.session && req.session.user) {
            if (req.session.user.session) {
                sessionDAO.touch(req.session.user.session, (err, entity) => {
                    if (!err) {
                        req.session.user.session = entity;
                    }
                });
            }
            next();
        } else {
            req.session.pageAfterLogin = req.originalUrl;
            res.redirect("/login");
        }
    }
}

module.exports = new UserDAO("../db/order-mgr.sqlite3");