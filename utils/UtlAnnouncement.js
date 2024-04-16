'use strict'

const { EmbedBuilder } = require('discord.js')
const { writeFileSync, mkdirSync, existsSync } = require('fs')
const schedule = require('node-schedule')
const { basename, join } = require('path')
const docReader = require('utils/UtlDocReader.js')
const { log } = require('utils/UtlLog.js')

class Announcement {

    constructor (_client) {
        const { announcement } = require('config.json')
        mkdirSync(announcement.path, { recursive: true })
        this.basepath = announcement.path
        this.config = join(announcement.path, announcement.config)

        if (!existsSync(this.config)) {
            writeFileSync(this.config, '[]')
        }

        this.client = _client
        this.ancmts = require(this.config)

        this.defaultAncmt = {
            "id": "",
            "server": "",
            "channel": "",
            "data": "",
            "image": "",
            "link": "",
            "schedule": {
                "mode": "",
                "time": ""
            }
        }
    }

    async send (_channel, _announcement, _link, _image, _guild) {
        this.client.channels.fetch(_channel).then( (el) => {
            el.send(this.buildMessage(_announcement, _link, _image, _guild))
        }).catch( (err) => {
            log.write('fetch channel error:', err)
        })
    }

    startPart (_ancmt) {
        log.write('new scheduler sched[', _ancmt.schedule.time, '] mode[', _ancmt.schedule.mode, '] data[', _ancmt.data, '] image[', _ancmt.image, ']')

        if (_ancmt.schedule.mode === 'one-shot') {
            const date = new Date(_ancmt.schedule.time)
            schedule.scheduleJob(_ancmt.id, date, () => {
                log.write('sending announcement', _ancmt.data)
                this.send(_ancmt.channel, docReader.read(_ancmt.data, this.basepath), _ancmt.link, _ancmt.image, _ancmt.server)
            })
        } else if (_ancmt.schedule.mode === 'routine') {
            schedule.scheduleJob(_ancmt.id, _ancmt.schedule.time, () => {
                log.write('sending announcement', _ancmt.data)
                this.send(_ancmt.channel, docReader.read(_ancmt.data, this.basepath), _ancmt.link, _ancmt.image, _ancmt.server)
            })
        } else {
            log.write('invalid schedule mode', _ancmt.schedule.mode)
        }
    }

    start () {
        this.ancmts.forEach(ancmt => {
            this.startPart(ancmt)
        })
    }

    setAnnouncement({_uuid, _server, _channel, _announcement, _link, _image, _time, _enable}) {
        if (!_uuid) {
            log.write('cannot set announcemnet without uuid')
        }

        let ancmt = this.getAnnouncement(_uuid)
        this.delAnnouncement(_uuid)

        ancmt.id = _uuid

        if (_channel) {
            ancmt.channel = _channel
        }

        if (_server) {
            ancmt.server = _server
        }

        if (_announcement) {
            writeFileSync(join(this.basepath,`${_uuid}.md`), _announcement)
            ancmt.data = _uuid
        }

        if (_link) {
            ancmt.link = _link
        }

        if (_image) {
            ancmt.image = _image
        }

        if (_time) {
            ancmt.schedule.time = _time
        }

        if (_enable) {
            ancmt.schedule.mode = 'one-shot'
            this.startPart(ancmt)
        } else {
            ancmt.schedule.mode = 'disabled'
        }

        this.ancmts.push(ancmt)
        writeFileSync(this.config, JSON.stringify(this.ancmts, null, 2))
    }

    getAnnouncement(_uuid) {
        let ancmt = this.ancmts.find((el) => el.id === _uuid) ?? structuredClone(this.defaultAncmt)
        return ancmt
    }

    delAnnouncement(_uuid) {
        let ancmt = this.getAnnouncement(_uuid)
        const idx = this.ancmts.indexOf(ancmt)
        if (idx === -1) {
            return
        }

        this.ancmts.splice(idx, 1)
        schedule.scheduledJobs[_uuid].cancel()
        writeFileSync(this.config, JSON.stringify(this.ancmts, null, 2))
        log.write(_uuid, 'announcement canceled')
    }

    mentionRule (_message, _guildId) {
        let regex = /@([\p{sc=Han}\w\d]+)/gu
        let match = []
        let m
        do {
            m = regex.exec(_message)
            if (m) {
                match.push(m)
            }
        } while (m)

        const allRules = this.client.guilds.cache.get(_guildId).roles.cache
        match.forEach( (el) => {
            allRules.forEach( (role) => {
                if (role.name === el[1]) {
                    _message = _message.replace(el[0], `<@&${role.id}>`)
                }
            })
        })

        return _message
    }

    buildMessage (_message, _link, _image, _guild) {
        let img = undefined
        const embed = new EmbedBuilder()
            .setTitle('蛋狗助手')
            .setColor("#9ea7e0")
            .setDescription(this.mentionRule(_message, _guild))
            .setFooter({ text: '蛋狗助手', iconURL: this.client.user.displayAvatarURL()})
            .setTimestamp()


        if (_link.length) {
            embed.setURL(_link)
        }

        if (_image.length) {
            if (_image.startsWith('http')) {
                embed.setImage(_image)
            } else {
                embed.setImage(`attachment://${basename(_image)}`)
                img = _image
            }
        }

        let msg = { embeds: [embed] }
        if (img) {
            msg.files = [img]
        }
        return msg
    }

}

module.exports = Announcement
