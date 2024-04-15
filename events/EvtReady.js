'use strict'

const { ActivityType, Collection } = require('discord.js')

const EvtBase = require('events/EvtBase')

const { bot } = require('config.json')

const Backends = require('backends/Backends.js')

const { log } = require('utils/UtlLog.js')
const ErrorHandler = require('utils/UtlErrHandler.js')
const Announcement = require('utils/UtlAnnouncement.js')

class EvtReady extends EvtBase {

    constructor () {
        super('ready')
    }

    async eventCallback (_client) {
        _client.errHandler = new ErrorHandler(_client, bot.debug)

        _client.user.setActivity('Splatoon 3', { type: ActivityType.Playing })

        _client.commands = new Collection()
        _client.commands = await _client.application.commands.fetch()

        _client.announcement = await new Announcement(_client)
        _client.announcement.start()

        _client.startTimestamp = Date.now()

        _client.backends = new Backends(_client)
        await _client.backends.connect()

        log.write('bot ready')
    }
}

module.exports = EvtReady
