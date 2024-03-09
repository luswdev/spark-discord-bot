'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { nanoid } = require('nanoid')

const CmdStart = require('commands/CmdStart.js')
const database = require('utils/UtlDatabase.js')

class CmdSubmit extends CmdStart {

    constructor () {
        super('submit')
    }

    doCmd (_interaction) {
        const uuid = nanoid()
        const round = 0
        const group = ''
        const team = []
        const check = false
        const reply = this.buildMessage(uuid, round, group, team, check, _interaction)
        return reply
    }

    async doButton (_btn, _interaction) {
        const uuid = _btn.uuid
        const round = _btn.round
        const group = _btn.group ?? ''
        const team = _btn.team ?? []
        const check = _btn.check ?? false

        const reply = this.buildMessage(uuid, round, group, team, check, _interaction)
        if (check) {
            let grp = database.getGroup(group)
            await super.appendResult(round, grp.group, grp.teams[team[0]], grp.teams[team[1]])
        }
        return reply
    }

    buildPointButton (_battleID, _group, _team, _interaction) {
        const selects = new ActionRowBuilder()
        for (let i = 0; i <= 2; i++) {
            selects.addComponents(
                new ButtonBuilder()
                    .setCustomId(JSON.stringify({ cmd: this.cmdKey, round: 8 + i, group: _group, team: _team, uuid: _battleID }))
                    .setLabel(`3-${i}`)
                    .setStyle(ButtonStyle.Secondary)
            )
        }
        return [selects]
    }

    buildMessage (_battleID, _round,  _group, _team, _check, _interaction) {
        let components = undefined
        let embed = new EmbedBuilder()
            .setTitle('結果回報 | 蛋狗助手')
            .setColor('#e79999')
            .setFooter({ text: `/${this.cmdKey} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        if (_group.length === 0) {
            embed.setDescription(`\n\n請選擇你的組別:`)
            components = super.buildGroupButton(_battleID, _round, _interaction)
        } else if (_team.length === 0) {
            let grp = database.getGroup(_group)
            embed.setDescription(`\n\n### 組別\n${grp.group}\n\n請選擇勝利的隊伍:`)
            components = super.buildTeamButton(_battleID, _round, _group, _team, _interaction)
        } else if (_team.length === 1) {
            let grp = database.getGroup(_group)
            embed.setDescription(`\n\n### 組別\n${grp.group}\n### 勝利隊伍\n${grp.teams[_team[0]]}\n\n請選擇落敗的隊伍:`)
            components = super.buildTeamButton(_battleID, _round, _group, _team, _interaction)
        } else if (_team.length === 2 && _round === 0){
            let grp = database.getGroup(_group)
            embed.setDescription(`\n### 組別\n${grp.group}\n### 勝利隊伍\n${grp.teams[_team[0]]}\n### 落敗隊伍\n${grp.teams[_team[1]]}\n\n請選擇比分:`)
            components = this.buildPointButton(_battleID, _group, _team, _interaction)
        } else if (_check === false) {
            let grp = database.getGroup(_group)
            embed.setDescription(`請確認以下結果是否正確\n### 比分\n3-${(_round - 5) % 3}\n### 組別\n${grp.group}\n### 勝利隊伍\n${grp.teams[_team[0]]}\n### 落敗隊伍\n${grp.teams[_team[1]]}`)
            components = super.buildCheckButton(_battleID, _round, _group, _team, _interaction)
        } else {
            let grp = database.getGroup(_group)
            embed.setDescription(`已回報結果。\n### 比分\n3-${(_round - 5) % 3}\n### 組別\n${grp.group}\n### 勝利隊伍\n${grp.teams[_team[0]]}\n### 落敗隊伍\n${grp.teams[_team[1]]}`)
        }

        let msg = { embeds: [embed] }
        if (components) {
            msg.components = components
        }
        return msg
    }
}

module.exports = CmdSubmit
