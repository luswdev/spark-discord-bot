'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { basename } = require('path')

const CmdBase = require('commands/CmdBase.js')
const database = require('utils/UtlDatabase.js')
const { findImg } = require('utils/UtlImgFinder.js')

class CmdPickMode extends CmdBase {

    constructor () {
        super('pickall')
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
        if (_code.length < 1 || _code.length > 3) {
            return { rule: { status: 'UNDEFINED' }, stage: { status: 'UNDEFINED' } }
        }

        const hasRule  = _code.match(/[a-z]/i)
        const hasStage = _code.match(/[0-9]+/i)

        let codeObj = { rule: { status: 'UNDEFINED' }, stage: { status: 'UNDEFINED' } }
        if (hasRule) {
            codeObj.rule = database.getListObject('rule', hasRule[0])
        }

        if (hasStage) {
            codeObj.stage = database.getListObject('stage', parseInt(hasStage[0], 10))
        }

        return codeObj
    }

    buildRuleButton (_interaction) {
        const selects = new ActionRowBuilder()
        for (let en of database.dataList.rule.enable) {
            let label = this.checkCode(en).rule.display
            selects.addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: en }))
                    .setLabel(label)
                    .setStyle(ButtonStyle.Primary)
            )
        }
        return selects
    }

    buildMapButton (_code, _interaction) {
        let selects = []
        for (let eni in database.dataList.stage.enable) {
            const actRowIdx = parseInt(eni / 3)
            if (!selects[actRowIdx]) {
                selects.push(new ActionRowBuilder())
            }

            let en = database.dataList.stage.enable[eni]
            let label = this.checkCode(en.toString()).stage.display
            selects[actRowIdx].addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: `${_code}${en}` }))
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
            desc += '請選擇一項規則'
        } else if (codeObj.stage.status !== 'ENABLED') {
            embed.setTitle(`${_interaction.user.displayName} 已選擇規則`)
            desc += codeObj.rule.icon + codeObj.rule.display
            desc += '\n\n請選擇一個場地'
        } else {
            embed.setTitle(`${_interaction.user.displayName} 已選擇規則與場地`)
            desc += '### 規則\n'
            desc += codeObj.rule.icon + codeObj.rule.display + '\n'
            desc += '### 場地\n'
            desc += codeObj.stage.display
            img = findImg('stage', codeObj.stage.name)
            embed.setImage(`attachment://${basename(img)}`)
        }
        embed.setDescription(desc)

        let msg = { embeds: [embed] }
        if (_code.length === 0) {
            msg.components = [this.buildRuleButton(_interaction)]
        }else if (codeObj.stage.status !== 'ENABLED') {
            msg.components = this.buildMapButton(_code, _interaction)
        }
        if (img) {
            msg.files = [img]
        }

        return msg
    }
}

module.exports = CmdPickMode
