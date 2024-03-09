'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { basename } = require('path')

const { nanoid } = require('nanoid')

const CmdStart = require('commands/CmdStart.js')
const database = require('utils/UtlDatabase.js')
const { findImg } = require('utils/UtlImgFinder.js')
const { db } = require('config.json')
const ConnDB = require('utils/UtlConnDB.js')

const mysql = new ConnDB(db)

const { log } = require('utils/UtlLog.js')


class CmdPickMode extends CmdStart {

    constructor () {
        super('scrim')
    }

    doCmd (_interaction) {
        const uuid = nanoid()
        mysql.newBattle(_interaction.user.id, uuid)
        const pickCode = ''
        const mode = ''
        const reply = this.buildMessage(uuid, pickCode, mode, _interaction)
        return reply
    }

    async doButton (_btn, _interaction) {
        const uuid = _btn.uuid
        const pickCode = _btn.code
        const mode = _btn.mode

        if (mode === 'free') {
            this.stageEn = Array.from({length: database.dataList.stage.data.length}, (_, i) => i + 1)
        } else {
            this.stageEn = database.dataList.stage.enable
        }
        await this.getRestStage(uuid)

        if (mode === 'league') {
            const round = _btn.round
            const reply = super.buildMessage(uuid, pickCode, round, _interaction)
            return reply
        }


        const act = _btn.action
        const reply = this.buildMessage(uuid, pickCode, mode, _interaction, act)
        return reply
    }

    buildNextButton (_uuid, _code, _interaction) {
        const selects = []
        if (this.stageEn.length > 1) {
            selects.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: '', mode: 'free', action: _code, uuid: _uuid }))
                            .setLabel('下一場（刪圖）')
                            .setStyle(ButtonStyle.Secondary)
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: '', mode: 'free', action: '', uuid: _uuid }))
                            .setLabel('下一場（不刪圖）')
                            .setStyle(ButtonStyle.Secondary)
                    )
            )
        }
        selects.push(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: '', mode: 'stop', action: '', uuid: _uuid }))
                        .setLabel('結束比賽')
                        .setStyle(ButtonStyle.Success)
                )
        )
        return selects
    }

    buildModeButton (_uuid, _interaction) {
        const selects = new ActionRowBuilder()
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: '', mode: 'league', round: 1, uuid: _uuid }))
                .setLabel('春季聯賽賽制')
                .setStyle(ButtonStyle.Secondary)
        )
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: '', mode: 'free', uuid: _uuid }))
                .setLabel('自由對戰')
                .setStyle(ButtonStyle.Secondary)
        )
        return selects
    }

    buildMessage (_battleID, _code, _mode, _interaction, _action = '') {
        let img = undefined
        let components = undefined
        let embed = new EmbedBuilder()
            .setColor('#99BDCD')
            .setTitle(`練習賽 | 蛋狗助手`)
            .setFooter({ text: `/${this.cmdKey} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        switch (_mode) {
            case 'free':
                if (_code.length === 0) {
                    embed.setDescription('請選擇一種規則\n\n(選擇自由對戰時，場地為**隨機**)')
                    components = [super.buildRuleButton(_battleID, 0, _interaction, 'free')]
                    if (_action.length > 0) {
                        const codeObj = super.checkCode(_action)
                        super.setStage(_battleID, codeObj.stage.name)
                    }
                } else {
                    _code = `${_code}${super.randomStage()}`
                    let codeObj = super.checkCode(_code)
                    embed.setTitle(`${_interaction.user.displayName} 已選擇規則 | 練習賽`)
                    let desc = '### 規則\n'
                    desc += codeObj.rule.icon + codeObj.rule.display + '\n'
                    desc += '### 場地\n'
                    desc += codeObj.stage.display
                    embed.setDescription(desc)
                    img = findImg('stage', codeObj.stage.name)
                    embed.setImage(`attachment://${basename(img)}`)
                    components = this.buildNextButton(_battleID, _code, _interaction)
                }
                break
            case 'stop':
                embed.setTitle('比賽結束 | 練習賽')
                break;
            default:
                embed.setDescription('請選擇一種模式')
                components = [this.buildModeButton(_battleID, _interaction)]
                break
        }

        let msg = { embeds: [embed] }
        if (components) {
            msg.components = components
        }
        if (img) {
            msg.files = [img]
        }
        return msg
    }
}

module.exports = CmdPickMode
