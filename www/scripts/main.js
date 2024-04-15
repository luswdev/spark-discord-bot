
const app = {
    data() {
        return {
            client: '',
            redirect: '',
            servers: [],
            channels: [],
            isLogin: false,
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
            const adjustedTime = new Date(now.getTime() - offsetMinutes * 60000)
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
        getChannels: function () {
            axios.get(`https://spark.lusw.dev/api/channels/${this.announcement.server}`).then( (res) => {
                this.channels = res.data.res
                this.announcement.channel.name = '選擇頻道'
            })
        },
        getAnnouncements: function () {
            axios.get(`https://spark.lusw.dev/api/announcements`).then( (res) => {
                console.log(res.data.res)
                this.historyAnnouncement = res.data.res.reverse()
            })
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
        setAnnouncement: function () {
            this.checkValidDate()

            axios.post('https://spark.lusw.dev/api/announcement', {
                server: this.announcement.server,
                channel: this.announcement.channel,
                date: this.announcement.date,
                content: this.announcement.content,
                image: this.announcement.image,
            }).then( () => {
                this.showModel('已成功設定公告', 'success')
            })

            let ancmt = this.announcement
            ancmt.server = this.servers.find( (server) => server.id === ancmt.server).name
            ancmt.channel = this.channels.find( (channel) => channel.id === ancmt.channel).name
            this.historyAnnouncement.push(ancmt)
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
    },
    computed: {
        checkFinish: function () {
            if (isNaN(parseInt(this.announcement.server)) || isNaN(parseInt(this.announcement.channel)) || this.announcement.content === '' || this.uploading) {
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
    }
}

Vue.createApp(app).mount('#app')
