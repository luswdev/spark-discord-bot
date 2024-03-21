'use strict'

const EvtBase = require('events/EvtBase')

const { log } = require('utils/UtlLog.js')

class EvtInteractionCreate extends EvtBase {

    constructor () {
        super('interactionCreate')
    }

    async eventCallback (_client, _interaction) {
        log.write('get interaction from:', _interaction.user.username)

        let command = ''
        let reply = undefined
        if (_interaction.isChatInputCommand()) {
            command  = _interaction.commandName

            log.write('parsing command:', command)

            await _interaction.deferReply()

            reply = await _client.cmdList.parseCmd(command, _interaction, _client)
        } else if (_interaction.isButton()) {
            const btn = JSON.parse(_interaction.customId)
            command = btn.cmd

            log.write('parsing button:', btn)

            await _interaction.deferReply()

            reply = await _client.cmdList.parseButton(btn, _interaction, _client)
        } else {
            log.write('unhandled interaction:', _interaction.type)
            return
        }

        await _interaction.editReply(reply)
        log.write('end of', command)
    }
}

module.exports = EvtInteractionCreate
