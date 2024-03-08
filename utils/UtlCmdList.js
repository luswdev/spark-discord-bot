'use strict'

const { SlashCommandBuilder, SlashCommandStringOption } = require('discord.js')

const { log } = require('utils/UtlLog.js')
const { bot } = require('config.json')

class CmdList {

    constructor () {
        this.cmds = []
        this.cmdsBuilder = []
    }

    installCmd (_cmd) {
        log.write('installing command:', _cmd.cmdKey)
        this.cmds.push(_cmd)

        const scb = new SlashCommandBuilder()
            .setName(_cmd.cmdKey)
            .setDescription(_cmd.cmdInfo)

        for (let opt of _cmd.options) {
            if (opt.type == 'string') {
                let strOption = new SlashCommandStringOption()
                strOption.setName(opt.name)
                    .setDescription(opt.info)
                scb.addStringOption(strOption)
            }
        }

        this.cmdsBuilder.push(scb)
    }

    checkCmdPermission (_cmd, _interaction) {
        if (_cmd.permission) {
            return bot.developer.find((uid) => uid === _interaction.user.id)
        } else {
            return true
        }
    }

    parseCmd (_cmdName, _interaction, _client) {
        for (let cmd of this.cmds) {
            if (_cmdName == cmd.cmdKey) {
                log.write('inner command:', cmd.cmdKey)

                if (this.checkCmdPermission(cmd, _interaction)) {
                    return cmd.doCmd(_interaction, _client)
                } else {
                    return _client.errHandler.permissionDeniedMsg()
                }
            }
        }
    }

    async parseButton(_btn, _interaction, _client) {
        for (let cmd of this.cmds) {
            if (_btn.cmd == cmd.cmdKey) {
                log.write('inner command:', cmd.cmdKey)

                if (this.checkCmdPermission(cmd, _interaction)) {
                    return await cmd.doButton(_btn, _interaction, _client)
                } else {
                    return _client.errHandler.permissionDeniedMsg()
                }
            }
        }
    }
}

module.exports = CmdList
