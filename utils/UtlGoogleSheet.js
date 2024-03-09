'use strict'

const { GoogleSpreadsheet } = require('google-spreadsheet')
const { JWT } = require('google-auth-library')

class GoogleSheet {

    constructor (_auth) {
        this.auth = require(_auth)
    }

    jwt() {
        return new JWT({
            email: this.auth.client_email,
            key: this.auth.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        })
    }

    async appendRow(_doc, _sheet, _row) {
        const creds = this.jwt()

        const doc = new GoogleSpreadsheet(_doc, creds)
        await doc.loadInfo()
        const sheet = doc.sheetsById[_sheet]
        await sheet.addRow(_row)
    }
}

module.exports = GoogleSheet
