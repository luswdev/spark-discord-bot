'use strict'

const { ActivityType, Collection } = require('discord.js')

const EvtBase = require('events/EvtBase')

const { bot } = require('config.json')

const { log } = require('utils/UtlLog.js')
const ErrorHandler = require('utils/UtlErrHandler.js')

class EvtReady extends EvtBase {

    constructor () {
        super('ready')
    }

    async eventCallback (_client) {
        _client.errHandler = new ErrorHandler(_client, bot.debug)

        _client.user.setActivity('Splatoon 3', { type: ActivityType.Playing })

        _client.commands = new Collection()
        _client.commands = await _client.application.commands.fetch()

        _client.startTimestamp = Date.now()

        log.write('bot ready')
    }
}

module.exports = EvtReady