'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { basename } = require('path')

const { nanoid } = require('nanoid')

const CmdBase = require('commands/CmdBase.js')
const database = require('utils/UtlDatabase.js')
const { findImg } = require('utils/UtlImgFinder.js')
const { db } = require('config.json')
const ConnDB = require('utils/UtlConnDB.js')

const mysql = new ConnDB(db)

class CmdStart extends CmdBase {

    constructor (_cmdKey) {
        if (_cmdKey) {
            super(_cmdKey)
        } else {
            super('start')
        }
        this.stageEn = database.dataList.stage.enable
    }

    doCmd (_interaction) {
        const uuid = nanoid()
        mysql.newBattle(_interaction.user.id, uuid)
        const pickCode = ''
        const round = 1
        const reply = this.buildMessage(uuid, pickCode, round, _interaction)
        return reply
    }

    async doButton (_btn, _interaction) {
        const uuid = _btn.uuid
        const pickCode = _btn.code
        const round = _btn.round

        this.stageEn = database.dataList.stage.enable
        await this.getRestStage(uuid)
        const reply = this.buildMessage(uuid, pickCode, round, _interaction)
        return reply
    }

    randomStage() {
        const stageList = this.stageEn
        return stageList[Math.floor(Math.random() * stageList.length)]
    }

    async getRestStage(_uuid, _stage) {
        if (this.stageEn.length === 0) {
            return
        }

        let stages = []
        for (let en of this.stageEn) {
            const stage = database.getListObject('stage', en)
            stages.push(stage)
        }
        const stageEn = await mysql.getStages(_uuid, stages)
        this.stageEn = []
        for (let en in stageEn) {
            if (stageEn[en] === 1) {
                this.stageEn.push(en)
            }
        }
    }

    setStage(_uuid, _stage) {
        mysql.setStage(_uuid, _stage)
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

    buildRoundButton (_uuid, _round, _interaction) {
        const selects = []
        if (_round < 5) {
            selects.push(new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: '', round: _round + 1, mode: 'league', uuid: _uuid }))
                        .setLabel(`第 ${_round} 場結束`)
                        .setStyle(ButtonStyle.Primary)
                )
            )
        }
        if (_round >= 3) {
            selects.push(new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: 'x99', round: 6, mode: 'league', uuid: _uuid }))
                        .setLabel(`比賽結束`)
                        .setStyle(ButtonStyle.Success)
                )
            )
        }
        return selects
    }

    buildRuleButton (_uuid, _round, _interaction, _mode = 'league') {
        const selects = new ActionRowBuilder()
        for (let en of database.dataList.rule.enable) {
            selects.addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: en, round: _round, mode: _mode, uuid: _uuid }))
                    .setEmoji(this.checkCode(en).rule.icon)
                    .setLabel(this.checkCode(en).rule.display)
                    .setStyle(ButtonStyle.Secondary)
            )
        }
        return selects
    }

    buildMapButton (_uuid, _code, _round, _interaction) {
        let selects = []
        for (let eni in this.stageEn) {
            const actRowIdx = parseInt(eni / 3)
            if (!selects[actRowIdx]) {
                selects.push(new ActionRowBuilder())
            }

            let en = this.stageEn[eni]
            let label = this.checkCode(en.toString()).stage.display
            selects[actRowIdx].addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: `${_code}${en}`, round: _round, mode: 'league', uuid: _uuid }))
                    .setLabel(label)
                    .setStyle(ButtonStyle.Secondary)
            )
        }
        return selects
    }

    buildMessage (_battleID, _code, _round, _interaction) {
        let img = undefined
        let embed = new EmbedBuilder()
            .setColor('#e79999')
            .setFooter({ text: `/${this.cmdKey} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        let additionTitle = '春季聯賽'
        if (this.cmdKey === 'scrim') {
            embed.setColor('#99BDCD')
            additionTitle = '練習賽'
        }
        embed.setTitle(`第 ${_round} 場 | ${additionTitle}`)

        let codeObj
        switch (_round) {
            case 1:
                _code = `d${this.randomStage()}`
                codeObj = this.checkCode(_code)
                embed.setDescription('### 規則\n' +
                                     `${codeObj.rule.icon} ${codeObj.rule.display}\n` +
                                     '### 場地\n' +
                                     `${codeObj.stage.display}\n`)
                img = findImg('stage', codeObj.stage.name)
                embed.setImage(`attachment://${basename(img)}`)
                break
            case 2:
            case 3:
            case 4:
            case 5:
                let ruleSelecter = '', stageSelecter = ''
                if (_round === 2) {
                    ruleSelecter = 'A 隊'
                    stageSelecter = 'B 隊'
                } else if (_round === 3) {
                    ruleSelecter = 'B 隊'
                    stageSelecter = 'A 隊'
                } else if (_round === 4) {
                    ruleSelecter = stageSelecter = '比分落後的隊伍'
                } else if (_round === 5) {
                    ruleSelecter = stageSelecter = '上一埸落敗的隊伍'
                }

                let desc = ''
                codeObj = this.checkCode(_code)
                if (_code.length === 0) {
                    desc += `${ruleSelecter}請選擇一項規則`
                } else if (codeObj.stage.status !== 'ENABLED') {
                    embed.setTitle(`${_interaction.user.displayName} 已選擇規則 (第 ${_round} 場) | ${additionTitle}`)
                    desc += codeObj.rule.icon + codeObj.rule.display
                    desc += `\n\n${stageSelecter}請選擇一個場地`
                } else {
                    embed.setTitle(`${_interaction.user.displayName} 已選擇規則與場地 (第 ${_round} 場) | ${additionTitle}`)
                    desc += '### 規則\n'
                    desc += codeObj.rule.icon + codeObj.rule.display + '\n'
                    desc += '### 場地\n'
                    desc += codeObj.stage.display
                    img = findImg('stage', codeObj.stage.name)
                    embed.setImage(`attachment://${basename(img)}`)
                }
                embed.setDescription(desc)
                break
            default:
                embed.setTitle('比賽結束 | 蛋狗助手')
                codeObj = this.checkCode(_code)
                break;
        }

        let msg = { embeds: [embed] }
        if (_code.length === 0) {
            msg.components = [this.buildRuleButton(_battleID, _round, _interaction)]
        } else if (codeObj.stage.status === 'UNDEFINED') {
            msg.components = this.buildMapButton(_battleID, _code, _round, _interaction)
        } else if (_round <= 5) {
            msg.components = this.buildRoundButton(_battleID, _round, _interaction)
        }
        if (img) {
            msg.files = [img]
        }

        if (codeObj.stage.status === 'ENABLED') {
            this.setStage(_battleID, codeObj.stage.name)
        }
        return msg
    }
}

module.exports = CmdStart
