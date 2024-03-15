'use strict'

const mysql = require('mysql')

const { log } = require('utils/UtlLog.js')

class ConnDB {

    constructor (_config) {
        this.conn = mysql.createPool(_config)
        this.battleTable = _config.battle_table
    }

    newBattle (_user, _uuid) {
        return new Promise( (resolve, reject) => {
            let query = this.conn.query(`INSERT INTO ${this.battleTable} (BattleID, CreateUser) VALUES (?, ?)`, [_uuid, _user])
            query
                .on('error', (err) => {
                    log.write('cannot new a battle:', err)
                    reject(-1)
                })
                .on('end', () => {
                    log.write('end of new battle:', _uuid)
                    resolve(0)
                })
        })
    }

    setStage (_uuid, _stage) {
        let stageCol = `${_stage}Stage`
        return new Promise( (resolve, reject) => {
            let query = this.conn.query(`UPDATE ${this.battleTable} SET ${stageCol} = ? WHERE BattleID = ?`, [false, _uuid])
            query
                .on('error', (err) => {
                    log.write('cannot set stage:', err)
                    reject(-1)
                })
                .on('end', () => {
                    log.write('end of set stage:', _stage)
                    resolve(0)
                })
        })
    }

    getStages (_uuid, _stages) {
        return new Promise( (resolve, reject) => {
            let queryStr = 'SELECT '
            for (let stage of _stages) {
                queryStr += `${stage.name}Stage AS '${stage.id}', `
            }
            queryStr = queryStr.slice(0, -2)
            queryStr += `FROM ${this.battleTable} WHERE BattleID = '${_uuid}'`
            this.conn.query(queryStr, (err, ret) => {
                if (err) {
                    log.write('cannot get stages:', err)
                    reject(-1)
                }

                if (ret.length !== 0) {
                    log.write('end of get stages')
                    resolve(ret[0])
                } else {
                    log.write('end of get stages:', ret)
                    resolve(0)
                }
            })
        })
    }
}

module.exports = ConnDB
