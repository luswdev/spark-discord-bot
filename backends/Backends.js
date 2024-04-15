'use strict'

const express = require('express')
const axios = require('axios')
const cors = require('cors')

const { nanoid } = require('nanoid')

const { backends, bot, announcement } = require('config.json')
const { log } = require('utils/UtlLog.js')

const docReader = require('utils/UtlDocReader.js')

class Backends {

    constructor (_client) {
        this.app = express()
        this.port = backends.port
        this.users = {}

        this.basepath = announcement.path
        this.client = _client
    }

    async connect () {
        this.servers = await this.getBotServers()

        this.app.use(express.urlencoded({extended: true}))
        this.app.use(express.json())
        this.app.use(cors())

        this.app.get('/api/id', this.getId())
        this.app.get('/api/redirect', this.getRedirect())
        this.app.get('/api/auth', this.auth())
        this.app.get('/api/user/:userId', this.getUser())
        this.app.get('/api/servers/:userId', this.getServers())
        this.app.get('/api/channels/:guildId', this.getChannels())

        this.app.get('/api/announcements', this.getAnnouncements())
        this.app.post('/api/announcement', this.setAnnouncement())

        this.app.listen(this.port, () => {
            log.write('start listening at', this.port)
        })
    }

    auth () {
        return async (req, res) => {
            if (!req.query.code) {
                res.redirect(`https://lusw.dev/spark/loginfailed`)
                return
            }

            const code = req.query.code
            const creds = btoa(`${bot.client_id}:${bot.secret}`);
            const resp = await axios({
                method: 'post',
                url: 'https://discord.com/api/v10/oauth2/token', 
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${creds}`,
                },
                data: {
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: backends.redirect,
                },
            }).catch( (err) => {
                log.write('error', err.response.status ?? '', err.response.data ?? '')
                res.redirect(`https://lusw.dev/spark/loginfailed`)
                return
            })

            const token = resp.data
            const userInfo = await this.getUserInformation(token)
            if (!userInfo) {
                res.redirect(`https://lusw.dev/spark/loginfailed`)
                return
            }

            this.saveUserToken(userInfo.id, token)
            res.redirect(`https://lusw.dev/spark/user/${userInfo.id}`)
        }
    }

    getId () {
        return (req, res) => {
            const id = bot.client_id
            const json = { res: id }
            res.json(json)
        }
    }

    getRedirect () {
        return (req, res) => {
            const redirect = backends.redirect
            const json = { res: redirect }
            res.json(json)
        }
    }

    async getBotServers () {
        const resp = await axios({
            method: 'get',
            url: 'https://discord.com/api/v10/users/@me/guilds',
            headers: {
                'Authorization': `Bot ${bot.token}`
            },
        }).catch( (err) => {
            log.write('error', err.response.status ?? '', err.response.data ?? '')
        })
        return resp ? resp.data : undefined
    }

    async getUserInformation (_token) {
        const resp = await axios({
            method: 'get',
            url: 'https://discord.com/api/v10/users/@me',
            headers: {
                'Authorization': `${_token.token_type} ${_token.access_token}`
            },
        }).catch( (err) => {
            log.write('error', err.response.status ?? '', err.response.data ?? '')
        })
        return resp ? resp.data : undefined
    }

    async getUserServers (_token) {
        const resp = await axios({
            method: 'get',
            url: 'https://discord.com/api/v10/users/@me/guilds',
            headers: {
                'Authorization': `${_token.token_type} ${_token.access_token}`
            },
        }).catch( (err) => {
            log.write('error', err.response.status ?? '', err.response.data ?? '')
        })
        return resp ? resp.data : undefined
    }

    async getServerChannels (_guidesId) {
        const resp = await axios({
            method: 'get',
            url: `https://discord.com/api/v10/guilds/${_guidesId}/channels`,
            headers: {
                'Authorization': `Bot ${bot.token}`
            },
        }).catch( (err) => {
            log.write('error', err.response.status ?? '', err.response.data ?? '')
        })
        return resp ? resp.data : undefined
    }

    saveUserToken (_id, _token) {
        this.users[_id] = _token
    }

    getUserToken (_id) {
        return this.users[_id]
    }

    getUser () {
        return async (req, res) => {
            const token = this.getUserToken(req.params.userId)
            if (!token) {
                res.status(401).json({ error: 'login first' })
                return
            }

            const info = await this.getUserInformation(token)
            if (!info) {
                res.status(400).json({ error: 'discord api failed' })
                return
            }

            info.developer = bot.developer.find((uid) => uid === info.id) ? true : false

            const json = { res: info }
            res.json(json)
        }
    }

    getServers () {
        return async (req, res) => {
            const token = this.getUserToken(req.params.userId)
            if (!token) {
                res.status(401).json({ error: 'login first' })
                return
            }

            const servers = await this.getUserServers(token)
            if (!servers) {
                res.status(400).json({ error: 'discord api failed' })
                return
            }

            let serversIncludeBot = []
            servers.forEach(server => {
                if (this.servers.find(s => s.id === server.id)) {
                    serversIncludeBot.push(server)
                }
            })

            const json = { res: serversIncludeBot }
            res.json(json)
        }
    }

    getChannels () {
        return async (req, res) => {
            const info = await this.getServerChannels(req.params.guildId)
            if (!info) {
                res.status(400).json({ error: 'discord api failed' })
                return
            }

            const json = { res: info }
            res.json(json)
        }
    }

    async getServerInfo (_id) {
        const resp = await axios({
            method: 'get',
            url: `https://discord.com/api/v10/guilds/${_id}`,
            headers: {
                'Authorization': `Bot ${bot.token}`
            },
        }).catch( (err) => {
            log.write('error', err.response.status ?? '', err.response.data ?? '')
        })
        return resp ? resp.data.name : undefined
    }

    async getChannelInfo (_id) {
        const resp = await axios({
            method: 'get',
            url: `https://discord.com/api/v10/channels/${_id}`,
            headers: {
                'Authorization': `Bot ${bot.token}`
            },
        }).catch( (err) => {
            log.write('error', err.response.status ?? '', err.response.data ?? '')
        })
        return resp ? resp.data.name : undefined
    }

    getAnnouncements () {
        return async (req, res) => {
            let ancmts = []
            for (let el of this.client.announcement.ancmts) {
                let ancmt = {}
                ancmt.server = await this.getServerInfo(el.server)
                ancmt.channel = await this.getChannelInfo(el.channel)
                ancmt.date = el.schedule.time
                ancmt.image = el.image,
                ancmt.content = docReader.read(el.data, this.basepath)
                ancmts.push(ancmt)
            }
            res.json({ res: ancmts })
        }
    }

    setAnnouncement () {
        return async (req, res) => {
            const ancmt = {
                _uuid: nanoid(),
                _time: req.body.date,
                _channel: req.body.channel,
                _announcement: req.body.content,
                _image: req.body.image,
                _server: req.body.server,
                _enable: true
            }
            this.client.announcement.setAnnouncement(ancmt)
            res.json({ res: 'ok' })
        }
    }
}

module.exports = Backends
