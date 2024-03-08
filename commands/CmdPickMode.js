'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

const CmdBase = require('commands/CmdBase.js')
const database = require('utils/UtlDatabase.js')

class CmdPickMode extends CmdBase {

    constructor () {
        super('pickmode')
    }

    doCmd (_interaction) {
        const pickCode = ''
        const reply = this.buildMessage(pickCode, _interaction)
        return reply
    }

    doButton (_btn, _interaction) {
        const pickCode = _btn.code
        const reply = this.buildMessage(pickCode, _interaction)
        return reply
    }

    checkCode(_code) {
        return database.getListObject('rule', _code)
    }

    buildButton (_interaction) {
        const selects = new ActionRowBuilder()
        for (let en of database.dataList.rule.enable) {
            let label = this.checkCode(en).display
            selects.addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: en }))
                    .setLabel(label)
                    .setStyle(ButtonStyle.Primary)
            )
        }
        return selects
    }

    buildMessage (_code, _interaction) {
        const codeObj = this.checkCode(_code)

        let embed = new EmbedBuilder()
           .setColor('#e79999')
           .setFooter({ text: `/${this.cmdKey} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
           .setTimestamp()

        let desc = ''
        if (_code.length === 0) {
            embed.setTitle('春季聯賽 | 蛋狗助手')
            desc += '請選擇一項規則'
        } else {
            embed.setTitle(`${_interaction.user.displayName} 已選擇規則`)
            desc += codeObj.icon + codeObj.display
        }
        embed.setDescription(desc)

        let msg = { embeds: [embed] }
        if (_code.length === 0) {
            msg.components = [this.buildButton(_interaction)]
        }

        return msg
    }
}

module.exports = CmdPickMode
