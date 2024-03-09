'use strict'

const { readdirSync, readFileSync } = require('fs')
const { join, parse } = require('path')

const { log } = require('utils/UtlLog.js')

class Database {

    constructor () {
        this.dataList = {}

        const dataFileList = readdirSync(join(__dirname, '..', 'data'), { withFileTypes: true })

        for (let data of dataFileList) {
            const topKey = parse(data.name).name
            const dataFile = join(__dirname, '..', 'data', data.name)
            const dataJson = JSON.parse(readFileSync(dataFile, 'utf8'))
            this.dataList[topKey] = dataJson
            log.write('load', topKey, 'data object done')
        }
    }

    getListObject (_category, _code) {
        let obj = {}
        if (!this.dataList[_category]){
            return { status: 'NOT_FOUND' }
        }

        obj = this.dataList[_category].data.find((row) => row.id === _code)
        if (obj) {
            if (this.dataList[_category].enable.includes(_code)) {
                obj.status = 'ENABLED'
            } else {
                obj.status = 'DISABLED'
            }
            return obj
        }
        return { status: 'OUT_OF_RANGE' }
    }

}

const database = new Database()
module.exports = database