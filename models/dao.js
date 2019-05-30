const path = require('path');
const sqlite3 = require("sqlite3").verbose();

class DAO {
    constructor(filename, tableName, fields, primaryKey) {
        this._filename = filename;
        this._tableName = tableName;
        this._fields = fields;
        this._pk = primaryKey;
    }

    get dataFile() {
        return path.join(__dirname, this._filename);
    }

    get tableName() {
        return this._tableName;
    }

    get fields() {
        return this._fields;
    }

    open() {
        var db = new sqlite3.Database(this.dataFile);
        return db;
    }

    get fieldList() {
        return this._fields.join(',');
    }

    /**
     * Escape identifier name from SQL keywords
     * @param {*} name 
     */
    escape(name) {
        return '"' + name + '"';
    }

    unEscape(name) {
        if (name.substr(name.length - 1) == '"') {
            if (name.substr(0, 1) == '"') {
                return name.substr(1, name.length - 2);
            }
        }
        return name;
    }

    dateToString(d) {
        var options = { 
            timeZone: 'Asia/Taipei', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit', 
        };
        return d.toLocaleDateString('zh-Tw', options);
    }
}

module.exports.DAO = DAO;