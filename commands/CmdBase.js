'use strict'

const cmds = require('commands/cmds.json')

class CmdBase {

    constructor (_key = '', _options = undefined) {
        let cmd = cmds.find( (e) => e.value === _key)

        this.cmdKey = cmd.value
        this.cmdInfo = cmd.info

        this.options = _options ?? cmd.options ?? []
        this.cmdData = cmd

        this.permission = cmd.permission
    }
}

module.exports = CmdBase