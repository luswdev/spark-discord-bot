'use strict'

const EvtBase = require('events/EvtBase')
const axios = require('axios')
const { createWriteStream } = require('fs')

const { nanoid } = require('nanoid')

const { log } = require('utils/UtlLog.js')

class EvtMessageCreate extends EvtBase {

    constructor () {
        super('messageCreate')
    }

    async downloadImg (_url, _path) {
        const res = await axios.get(_url, {responseType: 'stream'})
        return new Promise(resolve => {
            let stm = createWriteStream(_path)
            res.data.pipe(stm)
            stm.on('finish', resolve)
        })
    }

    async eventCallback (_client, _msg) {
        if (_msg.reference) {
            const refMsg = await _msg.channel.messages.fetch(_msg.reference.messageId)
            if (refMsg.author.id !== _client.user.id) {
                return
            }

            const cmd = refMsg.interaction ? refMsg.interaction.commandName : 'xadmin'
            if (cmd === 'xadmin') {
                const footer = refMsg.embeds[0].footer.text
                const regex = /\(([^)]+)\)/
                const found = footer.match(regex)
                const uuid = found ? found[1] : nanoid()
                let state = footer.split('(')[0].split(' ')[0]

                switch (state) {
                    case 'init':
                        log.write('#', uuid, 'announcement message set to', _msg.content)
                        _client.announcement.setAnnouncement({_uuid: uuid, _announcement: _msg.content})
                        
                        if (_msg.attachments.size > 0) {
                            this.downloadImg(_msg.attachments.first().url, `/tmp/spark/${uuid}.png`)
                            log.write('#', uuid, 'announcement message has image')
                            _client.announcement.setAnnouncement({_uuid: uuid, _image: `/tmp/spark/${uuid}.png`})
                        }
                        break
                    case 'setChannel':
                        if (!_msg.content.startsWith('https://discord.com/channels/')) {
                            _msg.reply('請輸入正確的頻道連結')
                            state = 'init'
                            break
                        }
                        const url =  _msg.content.split('/')
                        const channel = url[url.length - 1]
                        log.write('#', uuid, 'announcement channel set to', channel)
                        _client.announcement.setAnnouncement({_uuid: uuid, _channel: channel})
                        break
                    case 'setTime':
                        const date = new Date(_msg.content)
                        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
                        log.write('#', uuid, 'announcement time set to', dateStr)
                        _client.announcement.setAnnouncement({_uuid: uuid, _time: dateStr})
                        break
                    default:
                        log.write('#', uuid, 'unknown state:', state)
                        return
                }
                const reply = await _client.cmdList.parseReply(cmd, state, uuid, { user: { id: _msg.author.id }}, _client)
                _msg.reply(reply)
            }
        }
    }
}

module.exports = EvtMessageCreate
