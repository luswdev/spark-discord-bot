'use strict'

const { EmbedBuilder } = require('discord.js')
const schedule = require('node-schedule')
const { basename } = require('path')

const announcements = require('announcements.json')
const docReader = require('utils/UtlDocReader.js')
const { log } = require('utils/UtlLog.js')

class Announcement {

    constructor (_client) {
        this.client = _client
        this.ancmts = []

        announcements.forEach(async ancmt => {
            return new Promise( (resolve) => {
                _client.channels.fetch(ancmt.channel).then( (el) => {
                    this.ancmts.push({channel: el, announcement: ancmt.data, image: ancmt.image, link: ancmt.link, schedule: ancmt.scheduler})
                    resolve(true)
                }).catch( (err) => {
                    log.write('fetch channel error:', err)
                    resolve(true)   // ignore fetch error
                })
            })
        })
    }

    send (_channel, _announcement, _link, _image) {
        if (_channel) {
            _channel.send(this.buildMessage(_announcement, _link, _image))
        }
    }

    start () {
        this.ancmts.forEach(ancmt => {
            log.write('new scheduler sched[', ancmt.schedule.time, '] mode[', ancmt.schedule.mode, '] data[', ancmt.announcement, '] image[', ancmt.image, ']')

            if (ancmt.schedule.mode === 'one-shot') {
                const date = new Date(ancmt.schedule.time)
                schedule.scheduleJob(date, () => {
                    log.write('sending announcement', ancmt.announcement)
                    this.send(ancmt.channel, docReader.read(ancmt.announcement), ancmt.link, ancmt.image)
                })
            } else if (ancmt.schedule.mode === 'routine') {
                schedule.scheduleJob(ancmt.schedule.time, () => {
                    log.write('sending announcement', ancmt.announcement)
                    this.send(ancmt.channel, docReader.read(ancmt.announcement), ancmt.link, ancmt.image)
                })
            } else {
                log.write('invalid schedule mode', ancmt.schedule.mode)
            }
        })
    }

    buildMessage (_message, _link, _image) {
        let img = undefined
        const embed = new EmbedBuilder()
            .setTitle('蛋狗助手')
            .setColor("#9ea7e0")
            .setDescription(_message)
            .setFooter({ text: '蛋狗助手', iconURL: this.client.user.displayAvatarURL()})
            .setTimestamp()


        if (_link.length) {
            embed.setURL(_link)
        }

        if (_image.length) {
            embed.setImage(`attachment://${basename(_image)}`)
            img = _image
        }

        let msg = { embeds: [embed] }
        if (img) {
            msg.files = [img]
        }
        return msg
    }

}

module.exports = Announcement
