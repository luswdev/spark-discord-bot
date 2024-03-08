'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { basename } = require('path')

const CmdBase = require('commands/CmdBase.js')
const database = require('utils/UtlDatabase.js')
const { findImg } = require('utils/UtlImgFinder.js')

class CmdPickMode extends CmdBase {

    constructor () {
        super('pickmap')
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
        return database.getListObject('stage', parseInt(_code, 10))
    }

    buildButton (_interaction) {
        let selects = []
        for (let eni in database.dataList.stage.enable) {
            const actRowIdx = parseInt(eni / 3)
            if (!selects[actRowIdx]) {
                selects.push(new ActionRowBuilder())
            }

            let en = database.dataList.stage.enable[eni]
            let label = this.checkCode(en).display
            selects[actRowIdx].addComponents(
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

        let img = undefined
        let embed = new EmbedBuilder()
           .setColor('#e79999')
           .setFooter({ text: `/${this.cmdKey} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
           .setTimestamp()

        let desc = ''
        if (_code.length === 0) {
            embed.setTitle('春季聯賽 | 蛋狗助手')
            desc += '請選擇一個場地'
        } else {
            embed.setTitle(`${_interaction.user.displayName} 已選擇場地`)
            desc += codeObj.display
            img = findImg('stage', codeObj.name)
            embed.setImage(`attachment://${basename(img)}`)
        }
        embed.setDescription(desc)

        let msg = { embeds: [embed] }
        if (_code.length === 0) {
            msg.components = this.buildButton(_interaction)
        }
        if (img) {
            msg.files = [img]
        }

        return msg
    }
}

module.exports = CmdPickMode
