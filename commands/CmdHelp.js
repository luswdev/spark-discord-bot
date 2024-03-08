'use strict'

const { EmbedBuilder } = require('discord.js')

const CmdBase = require('commands/CmdBase.js')
const docReader = require('utils/UtlDocReader.js')

class CmdHelp extends CmdBase {

    constructor () {
        super('help')
    }

    doCmd (_interaction) {
        const reply = this.buildMessage(_interaction)
        return reply
    }

    buildMessage (_interaction) {
        const embed = new EmbedBuilder()
            .setColor("#9ea7e0")
            .setDescription(docReader.read('leagueRule'))
            .setFooter({ text: `/${this.cmdKey} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        return { embeds: [embed] }
    }
}

module.exports = CmdHelp
