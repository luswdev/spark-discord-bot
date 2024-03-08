'use strict'

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

class DocReader {

    constructor () {
        this.basepath = './docs'
        this.extinsion = 'md'
    }

    read (_name) {
        let path = `${join(this.basepath, _name)}.${this.extinsion}`
        if (existsSync(path)) {
            return readFileSync(path).toString()
        }
        return `${path}: invalid path.`
    }
}

const docReader = new DocReader()
module.exports.read = (_name) => docReader.read(_name)
