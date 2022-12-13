const mysql = require("mysql");
const uuid = require("uuid/v4");

const connection = mysql.createPool({
    host: "localhost",
    user: "admin",
    password: "123456",
    database: "blog",
    multipleStatements: true,
    timezone:'08:00',
})

const db = {
    executeSql: (sql,params=[]) => {
        return new Promise((resolve, reject) => {
        
            connection.query(sql, params, (err, result, fields) => {
                if (err) reject(err);
                if (result instanceof Object){
                    resolve(result);
                    return false;
                }
                if(result){
                result.map(element => {
                    for(let i in element){
                        element[i] = element[i]==null?"":element[i];//过滤数据库null字段
                    }
                    return element
                });
                }
                resolve(result);
            });
        });
    },
    add: (addObj, tableName) => {
        return new Promise((resolve, reject) => {
            let keys = Object.keys(addObj).toString();
            let values = Object.values(addObj);
            let id = uuid();
            values.unshift(id);

            let sql = `insert into ${tableName}(id,${keys.toString()}) values (${values.map(item => { return "?" })})`;

            connection.query(sql, values, (err, result, fields) => {
                if (err) reject(err);
                resolve(id);
            });
        });
    },
    addBatch: (addObjs, tableName) => {
        return new Promise((resolve, reject) => {
            let keys = Object.keys(addObjs[0]);
            let values = [];
            addObjs.forEach(element => {
                let id = uuid();
                let value = Object.values(element);
                value.unshift(id);
                values.push(value);
            });
            let sql = `insert into ${tableName}(id,${keys.toString()}) values ?`;

            connection.query(sql, [values], (err, result, fields) => {
                if (err) reject(err);
                resolve(values.map(item => { return item[0] }));
            });
        });
    },
    update: (updateObj, tableName) => {
        return new Promise((resolve, reject) => {
            let keys = Object.keys(updateObj);
            let values = Object.values(updateObj);

            let sql = `update ${tableName} set ${keys.map((item, index) => {
                return item + "=?";
            })} where id = '${updateObj.id}'`;
            connection.query(sql, values, (err, result, fields) => {
                if (err) reject(err);
                if (result.affectedRows === 0 && result) {
                    resolve(0);
                    return false;
                }
                resolve(updateObj);
            });
        });
    },
    updateBatch: (updateObjs, tableName) => {
        return new Promise((resolve, reject) => {
            let sql = "";
            updateObjs.forEach(element => {
                let keys = Object.keys(element);
                let values = Object.values(element);

                sql += `update ${tableName} set ${keys.map((item, index) => {
                    return `${item}='${values[index]}'`;
                })} where id = '${element.id}';`;
            });

            connection.query(sql, (err, result, fields) => {
                if (err) reject(err);
                let affectedRows = 0;
                result.forEach(element => {
                    affectedRows += element.affectedRows;
                });
                if (affectedRows === 0) {
                    resolve(0);
                    return false;
                }
                resolve(updateObjs);
            });
        });
    },
    delete: (deleteObj, tableName) => {
        return new Promise((resolve, reject) => {
            let sql = `delete from ${tableName} where id = '${deleteObj.id}'`;
            connection.query(sql, (err, result) => {
                if (err) reject(err);
                resolve("已删除");
            });
        })
    },
    deleteBatch: (deleteObjs, tableName) => {
        return new Promise((resolve, reject) => {
            let ids = deleteObjs.map(element => { return element.id });
            let sql = `delete from ${tableName} where id in (${deleteObjs.map(element => { return "?" })})`;
            connection.query(sql, ids, (err, result) => {
                if (err) reject(err);
                if (result.affectedRows === 0) {
                    resolve(0);
                    return false;
                }
                resolve("已删除");
            });
        });
    }
}

module.exports = db;
