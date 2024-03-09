'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { basename } = require('path')

const { nanoid } = require('nanoid')

const CmdBase = require('commands/CmdBase.js')
const database = require('utils/UtlDatabase.js')
const { findImg } = require('utils/UtlImgFinder.js')
const { db, googlesheet } = require('config.json')
const ConnDB = require('utils/UtlConnDB.js')
const GoogleSheet = require('utils/UtlGoogleSheet.js')

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
        const round = 0
        const reply = this.buildMessage(uuid, pickCode, round, _interaction)
        return reply
    }

    async doButton (_btn, _interaction) {
        const uuid = _btn.uuid
        const pickCode = _btn.code ?? ''
        const round = _btn.round
        const group = _btn.group ?? ''
        const team = _btn.team ?? []
        const check = _btn.check ?? false

        this.stageEn = database.dataList.stage.enable
        await this.getRestStage(uuid)
        const reply = this.buildMessage(uuid, pickCode, round, _interaction, group, team, check)
        if (check) {
            let grp = database.getGroup(group)
            await this.appendResult(round, grp.group, grp.teams[team[0]], grp.teams[team[1]])
        }
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

    getCurrentTime() {
        const t = new Date(Date.now())
        return `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:${t.getMinutes()}:${t.getSeconds()}`
    }

    async appendResult(_round, _group, _teamW, _teamL) {
        const gsheet = new GoogleSheet(googlesheet.auth)
        const row = {
            '時間戳記': this.getCurrentTime(),
            '參賽級別以及組別': _group,
            '勝利隊伍名稱': _teamW,
            '落敗隊伍名稱': _teamL,
            '勝方分數': 3,
            '敗方分數': (_round - 5) % 3
        }
        await gsheet.appendRow(googlesheet.doc, googlesheet.sheet, row)
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
                        .setCustomId(JSON.stringify({ cmd: this.cmdKey, code: 'x99', round: _round + 5, mode: 'league', uuid: _uuid }))
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

    buildGroupButton(_uuid, _round, _interaction) {
        let selects = []
        let actRowIdx = -1
        for (let grpi in database.dataList.team) {
            const grp = database.dataList.team[grpi]

            if (grp.id.indexOf('1') !== -1) {
                actRowIdx++
            }

            if (!selects[actRowIdx]) {
                selects.push(new ActionRowBuilder())
            }

            selects[actRowIdx].addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, round: _round, group: grp.id, uuid: _uuid }))
                    .setLabel(grp.group)
                    .setStyle(ButtonStyle.Secondary)
            )
        }
        return selects
    }

    buildTeamButton(_uuid, _round, _group, _team, _interaction) {
        const grp = database.getGroup(_group)
        let selects = []
        let btnCnt = 0
        grp.teams.forEach( (team, idx) => {
            if (_team.length > 0 && _team[0] === idx) {
                return
            }

            const actRowIdx = parseInt(++btnCnt / 3)
            if (!selects[actRowIdx]) {
                selects.push(new ActionRowBuilder())
            }

            _team.push(idx)
            selects[actRowIdx].addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, round: _round, group: grp.id, team: _team, uuid: _uuid }))
                    .setLabel(team)
                    .setStyle(ButtonStyle.Secondary)
            )
            _team.pop(idx)
        })
        return selects
    }

    buildCheckButton(_uuid, _round, _group, _team, _interaction) {
        let selects = new ActionRowBuilder()
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, round: _round, group: _group, team: _team, check: true, uuid: _uuid }))
                .setLabel('沒問題')
                .setStyle(ButtonStyle.Success)
        )
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, round: _round, uuid: _uuid }))
                .setLabel('重新選擇')
                .setStyle(ButtonStyle.Danger)
        )
        return [selects]
    }

    buildStartButton(_uuid, _interaction) {
        let selects = new ActionRowBuilder()
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, round: 1, uuid: _uuid }))
                .setLabel('是')
                .setStyle(ButtonStyle.Success)
        )
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, round: -1, uuid: _uuid }))
                .setLabel('否')
                .setStyle(ButtonStyle.Secondary)
        )
        return [selects]
    }

    buildMessage (_battleID, _code, _round, _interaction, _group = '', _team = [], _check = false) {
        let img = undefined
        let components = undefined
        let embed = new EmbedBuilder()
            .setColor('#e79999')
            .setFooter({ text: `/${this.cmdKey} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        let additionTitle = '春季聯賽'
        if (this.cmdKey === 'scrim') {
            embed.setColor('#99BDCD')
            additionTitle = '練習賽'
        }
        if (_round > 0) {
            embed.setTitle(`第 ${_round} 場 | ${additionTitle}`)
        } else {
            embed.setTitle(`${additionTitle} | 蛋狗助手`)
        }

        let codeObj
        switch (_round) {
            case 0:
                codeObj = this.checkCode(_code)
                embed.setDescription('是否要開始春季聯賽的比賽')
                components = this.buildStartButton(_battleID, _interaction)
                break
            case -1:
                codeObj = this.checkCode(_code)
                embed.setDescription('感謝使用蛋狗助手')
                break
            case 1:
                _code = `d${this.randomStage()}`
                codeObj = this.checkCode(_code)
                embed.setDescription('### 規則\n' +
                                     `${codeObj.rule.icon} ${codeObj.rule.display}\n` +
                                     '### 場地\n' +
                                     `${codeObj.stage.display}\n`)
                img = findImg('stage', codeObj.stage.name)
                embed.setImage(`attachment://${basename(img)}`)
                components = this.buildRoundButton(_battleID, _round, _interaction)
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
                    components = [this.buildRuleButton(_battleID, _round, _interaction)]
                } else if (codeObj.stage.status !== 'ENABLED') {
                    embed.setTitle(`${_interaction.user.displayName} 已選擇規則 (第 ${_round} 場) | ${additionTitle}`)
                    desc += codeObj.rule.icon + codeObj.rule.display
                    desc += `\n\n${stageSelecter}請選擇一個場地`
                    components = this.buildMapButton(_battleID, _code, _round, _interaction)
                } else {
                    embed.setTitle(`${_interaction.user.displayName} 已選擇規則與場地 (第 ${_round} 場) | ${additionTitle}`)
                    desc += '### 規則\n'
                    desc += codeObj.rule.icon + codeObj.rule.display + '\n'
                    desc += '### 場地\n'
                    desc += codeObj.stage.display
                    img = findImg('stage', codeObj.stage.name)
                    embed.setImage(`attachment://${basename(img)}`)
                    components = this.buildRoundButton(_battleID, _round, _interaction)
                }
                embed.setDescription(desc)
                break
            default:
                embed.setTitle('比賽結束 | 蛋狗助手')
                if (this.cmdKey !== 'scrim') {
                    if (_group.length === 0) {
                        embed.setDescription(`比分為 3-${(_round - 5) % 3}，回報結果中。\n\n請選擇你的組別:`)
                        components = this.buildGroupButton(_battleID, _round, _interaction)
                    } else if (_team.length === 0) {
                        let grp = database.getGroup(_group)
                        embed.setDescription(`比分為 3-${(_round - 5) % 3}，回報結果中。\n\n### 組別\n${grp.group}\n\n請選擇勝利的隊伍:`)
                        components = this.buildTeamButton(_battleID, _round, _group, _team, _interaction)
                    } else if (_team.length === 1) {
                        let grp = database.getGroup(_group)
                        embed.setDescription(`比分為 3-${(_round - 5) % 3}，回報結果中。\n\n### 組別\n${grp.group}\n### 勝利隊伍\n${grp.teams[_team[0]]}\n\n請選擇落敗的隊伍:`)
                        components = this.buildTeamButton(_battleID, _round, _group, _team, _interaction)
                    } else if (_check === false) {
                        let grp = database.getGroup(_group)
                        embed.setDescription(`請確認以下結果是否正確\n### 比分\n3-${(_round - 5) % 3}\n### 組別\n${grp.group}\n### 勝利隊伍\n${grp.teams[_team[0]]}\n### 落敗隊伍\n${grp.teams[_team[1]]}`)
                        components = this.buildCheckButton(_battleID, _round, _group, _team, _interaction)
                    } else {
                        let grp = database.getGroup(_group)
                        embed.setDescription(`已回報結果。\n### 比分\n3-${(_round - 5) % 3}\n### 組別\n${grp.group}\n### 勝利隊伍\n${grp.teams[_team[0]]}\n### 落敗隊伍\n${grp.teams[_team[1]]}`)
                    }
                }
                codeObj = this.checkCode('x99')
                break;
        }

        let msg = { embeds: [embed] }
        if (components) {
            msg.components = components
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
