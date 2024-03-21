'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { basename } = require('path')

const CmdBase = require('commands/CmdBase.js')
const docReader = require('utils/UtlDocReader.js')

class CmdHelp extends CmdBase {

    constructor () {
        super('xadmin')
    }

    async doCmd (_interaction, _client) {
        const reply = await this.buildMessage('init', '', _client)
        return reply
    }

    async doReply (_curState, _uuid, _interaction, _client) {
        const next = this.nextStep(_curState)
        const reply = await this.buildMessage(next, _uuid, _client)
        return reply
    }

    async doButton (_btn, _interaction, _client) {
        const check = _btn.check
        const uuid = _btn.uuid

        if (check) {
            _client.announcement.setAnnouncement({_uuid: uuid, _enable: check})
        } else {
            _client.announcement.delAnnouncemnet(uuid)
        }

        const reply = await this.buildMessage('done', uuid, _client, check)
        return reply
    }

    nextStep (_curState) {
        switch (_curState) {
            case 'init':
                return 'setChannel'
            case 'setChannel':
                return 'setTime'
            case 'setTime':
                return 'final'
            case 'final':
                return 'done'
            default:
                return 'init'
        }
    }

    buildCheckButton(_uuid) {
        let selects = new ActionRowBuilder()
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, uuid: _uuid, check: true }))
                .setLabel('沒問題')
                .setStyle(ButtonStyle.Success)
        )
        selects.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({ cmd: this.cmdKey, uuid: _uuid, check: false }))
                .setLabel('放棄')
                .setStyle(ButtonStyle.Danger)
        )
        return [selects]
    }

    async buildMessage (_state, _uuid, _client, _check = false) {
        const embed = []
        let components = undefined
        let img = undefined

        switch (_state) {
            case 'setChannel':
                embed.push(new EmbedBuilder()
                    .setColor('#9ea7e0')
                    .setDescription('請回覆此訊息以設定公告的頻道 (貼上頻道的連結)')
                    .setFooter({ text: `${_state} (${_uuid})`, iconURL: _client.user.avatarURL() })
                )
                break;
            case 'setTime':
                embed.push(new EmbedBuilder()
                    .setColor('#9ea7e0')
                    .setDescription('請回覆此訊息以設定公告的時間 (YYYY-MM-DD HH:MM:SS)')
                    .setFooter({ text: `${_state} (${_uuid})`, iconURL: _client.user.avatarURL() })
                )
                break;
            case 'final':
                const ancmt = _client.announcement.getAnnouncement(_uuid)
                const channel = await _client.channels.fetch(ancmt.channel)
                const { announcement } = require('config.json')
                embed.push(new EmbedBuilder()
                    .setColor('#9ea7e0')
                    .setDescription(`請確認以下資訊是否正確:\n### 公告內容\n${docReader.read(ancmt.data, announcement.path)}\n### 公告頻道\n${channel.name}\n### 公告時間\n${ancmt.schedule.time}`)
                    .setFooter({ text: `${_state} (${_uuid})`, iconURL: _client.user.avatarURL() })
                )
                components = this.buildCheckButton(_uuid)
                if (ancmt.image) {
                    img = ancmt.image
                    embed[0].setImage(`attachment://${basename(img)}`)
                }
                break;
            case 'done':
                embed.push(new EmbedBuilder()
                    .setColor('#9ea7e0')
                    .setDescription(_check ? '設定成功' : '已取消')
                    .setFooter({ text: `${_state} (${_uuid})`, iconURL: _client.user.avatarURL() })
                )
                break;
            case 'init':
            default:
                embed.push(new EmbedBuilder()
                    .setColor('#9ea7e0')
                    .setDescription('請回覆此訊息以設定公告內容')
                    .setFooter({ text: `${_state} (${_uuid})`, iconURL: _client.user.avatarURL() })
                )
                break;
        }

        let msg = { embeds: embed }
        if (components) {
            msg.components = components
        }
        if (img) {
            msg.files = [img]
        }
        return msg
    }
}

module.exports = CmdHelp
