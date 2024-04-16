
const app = {
    data() {
        return {
            client: '',
            redirect: '',
            servers: [],
            channels: [],
            isLogin: false,
            isMod: false,
            discord: {
                username: '',
                id: '',
                avatar: '',
                developer: false,
            },
            uploading: false,
            announcement: {
                server:  '選擇伺服器',
                channel: '選擇頻道',
                date: '',
                content: '',
                image: '',
            },
            historyAnnouncement: [],
            model: {
                show: false,
                style: '',
                text: '',
            },
            isUploading: false,
            updateKey: 0,
            previewContent: '',
        }
    },
    methods: {
        login: function () {
            window.location.href = `https://discordapp.com/api/oauth2/authorize?client_id=${this.client}&scope=identify%20guilds&response_type=code&redirect_uri=${this.redirect}`
        },
        logout: function () {
            this.isLogin = false
            this.historyAnnouncement = []
            history.pushState({}, null, '/spark')
        },
        updateAnnouncementDate: function () {
            const now = new Date()
            const offsetMinutes = now.getTimezoneOffset()
            const adjustedTime = new Date(now.getTime() - offsetMinutes * 60000 + 60000 * 5)
            const formattedTime = adjustedTime.toISOString().slice(0, 16)
            this.announcement.date = formattedTime
        },
        getUser: async function (_id) {
            await axios.get(`https://spark.lusw.dev/api/user/${_id}`).then( (res) => {
                this.discord.username = res.data.res.global_name
                this.discord.avatar = `https://cdn.discordapp.com/avatars/${res.data.res.id}/${res.data.res.avatar}.png`
                this.discord.developer = res.data.res.developer
            }).catch( () => {
                this.logout()
            })
        },
        getServers: function (_id) {
            axios.get(`https://spark.lusw.dev/api/servers/${_id}`).then( (res) => {
                this.servers = res.data.res
            }).catch( () => {
                this.isLogin = false
            })
        },
        getChannels: async function () {
            await axios.get(`https://spark.lusw.dev/api/channels/${this.announcement.server}`).then( (res) => {
                this.channels = res.data.res
            })
        },
        getAnnouncements: async function () {
            await axios.get(`https://spark.lusw.dev/api/announcements`).then( (res) => {
                this.historyAnnouncement = res.data.res.reverse()
                this.historyAnnouncement.forEach(el => {
                    el.isNew = this.isNew(el.date)
                })
                this.isUploading = false
            })
        },
        isNew: function (_date) {
            const now = new Date()
            const ancmtDate = new Date(_date)
            return ancmtDate >= now
        },
        checkValidDate: function () {
            const now = new Date()
            const offsetMinutes = now.getTimezoneOffset()
            const adjustedTime = new Date(now.getTime() - offsetMinutes * 60000 + 60000 * 5)    // may more then 5 mins
            const formattedTime = adjustedTime.toISOString().slice(0, 16)
            if (this.announcement.date < formattedTime) {
                this.announcement.date = formattedTime
                this.showModel(`已自動調整公告時間為 ${formattedTime}，請選擇大於 5 分鐘的時間`, 'warning')
            }
        },
        uploadFile: function (_evt) {
            this.uploading = true

            var formData = new FormData()
            formData.append('image', _evt.target.files[0])

            axios.post('https://api.imgur.com/3/image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: 'Client-ID 358ebbb99696167',
                },
            }).then((resp) => {
                this.announcement.image = resp.data.data.link
                this.uploading = false
            }).catch(error => {
                console.error('Error uploading image:', error)
            })
        },
        showModel: function (_text, _style = 'success', during = 3000, _timecb = undefined) {
            this.model.show = false

            this.model.text = _text
            this.model.style = _style
            this.model.show = true

            let cb = undefined
            let remain = during
            if (_timecb) {
                cb = setInterval(() => {
                    _timecb(remain)
                    remain -= 1000
                }, 1000)
            }

            if (during !== -1){
                setTimeout(() => {
                    this.model.show = false
                    if (cb) {
                        clearInterval(cb)
                    }
                }, during)
            }

        },
        copyAncmt: async function (_ancmt) {
            console.log('copy')
            this.announcement.server = _ancmt.server.id
            await this.getChannels()
            this.announcement.channel = _ancmt.channel.id
            this.announcement.content = _ancmt.content
            this.announcement.image = _ancmt.image
        },
        modAncmt: async function (_ancmt) {
            console.log('mod')
            this.isMod = _ancmt.uuid

            this.announcement.server = _ancmt.server.id
            await this.getChannels()
            this.announcement.channel = _ancmt.channel.id
            this.announcement.content = _ancmt.content
            this.announcement.image = _ancmt.image
            this.announcement.date = _ancmt.date
        },
        delAncmt: function (_ancmt) {
            this.historyAnnouncement.find( (el, idx) => {
                if (el.uuid === _ancmt.uuid) {
                    this.historyAnnouncement[idx].deleting = true
                }
            })
            axios.delete('https://spark.lusw.dev/api/announcement', {
                data: {
                    id: _ancmt.uuid,
                },
            }).then( () => {
                this.showModel('已刪除公告', 'success')
                this.getAnnouncements()
            })
        },
        setAnnouncement: function () {
            this.isUploading = true
            this.checkValidDate()

            if (this.isMod) {
                axios.put('https://spark.lusw.dev/api/announcement', {
                    id: this.isMod,
                    server: this.announcement.server,
                    channel: this.announcement.channel,
                    date: this.announcement.date,
                    content: this.announcement.content,
                    image: this.announcement.image,
                }).then( () => {
                    this.showModel('已成功修改公告', 'success')
                })
                this.isMod = false
            } else {
                axios.post('https://spark.lusw.dev/api/announcement', {
                    server: this.announcement.server,
                    channel: this.announcement.channel,
                    date: this.announcement.date,
                    content: this.announcement.content,
                    image: this.announcement.image,
                }).then( () => {
                    this.showModel('已成功設定公告', 'success')
                })
            }

            let ancmt = this.announcement
            ancmt.server  = { id: this.announcement.server,  name: this.servers.find( (server) => server.id === this.announcement.server).name,     link: `https://discord.com/channels/${this.announcement.server}` }
            ancmt.channel = { id: this.announcement.channel, name: this.channels.find( (channel) => channel.id === this.announcement.channel).name, link: `https://discord.com/channels/${this.announcement.server}/${this.announcement.channel}` }
            ancmt.isNew = true
            this.getAnnouncements()
            this.announcement =  {
                server: '選擇伺服器',
                channel: '選擇頻道',
                date: '',
                content: '',
                image: '',
            }
            this.$refs.ancmtImage.value = ''
            this.updateAnnouncementDate()
        },
        clearImage: function () {
            this.announcement.image = ''
            this.$refs.ancmtImage.value = ''
        },
        clearAll: function () {
            this.isMod = false
            this.announcement =  {
                server: '選擇伺服器',
                channel: '選擇頻道',
                date: '',
                content: '',
                image: '',
            }
            this.$refs.ancmtImage.value = ''
            this.updateAnnouncementDate()
        },
        renderPreview: function () {
            this.previewContent = marked.parse(this.announcement.content)
        },
    },
    computed: {
        checkFinish: function () {
            this.updateKey
            if ((this.$refs.selectServer && this.$refs.selectServer.value === '') ||
                (this.$refs.selectChannel && this.$refs.selectChannel.value === '')) {
                return false
            }

            if (isNaN(parseInt(this.announcement.server)) || isNaN(parseInt(this.announcement.channel)) ||
                this.announcement.content === '' || this.uploading) {
                return false
            }
            return this.isLogin
        },
    },
    mounted: async function () {
        axios.get('https://spark.lusw.dev/api/id').then( (res) => {
            this.client = res.data.res
        })
        axios.get('https://spark.lusw.dev/api/redirect').then( (res) => {
            this.redirect = encodeURIComponent(res.data.res)
        })

        let href = window.location.href
        if (href.split('/').length > 5) {
            this.discord.id = href.split('/')[5]
            if (this.discord.id  !== '') {
                await this.getUser(this.discord.id)

                if (this.discord.username !== '') {
                    if (!this.discord.developer) {
                        this.showModel('你不是開發者，無法使用此服務，將於 5 秒後跳轉至魷樂園首頁', 'danger', 6000, (msec) => {
                            if (msec === 1000) {
                                window.location.href = 'https://www.sp-spark.com/'
                            }
                            this.model.text = `你不是開發者，無法使用此服務，將於 ${msec / 1000 - 1} 秒後跳轉至魷樂園首頁`
                        })
                    } else {
                        this.isLogin = true
                        this.getServers(this.discord.id)
                        this.getAnnouncements()
                    }
                }
            }
        } else {
            this.showModel('請先登入 Discord', 'danger', -1)
        }

        if (!this.isLogin && this.discord.developer) {
            this.showModel('請先登入 Discord', 'danger', -1)
        }

        this.updateAnnouncementDate()

        // check for clear new badge
        setInterval(() => {
            this.historyAnnouncement.forEach(el => {
                el.isNew = this.isNew(el.date)
            })
        }, 60000)

        // recompute checkFinish
        setInterval(() => {
            ++this.updateKey
        }, 1000)
    }
}

const appVm = Vue.createApp(app).mount('#app')
