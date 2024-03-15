const { log } = require('cozy-konnector-libs')

const API_ROOT = 'https://monere-api.epargne-retraite-entreprises.bnpparibas.com/api/v1'

class BNPEREApi {
  constructor(email, token) {
    this.email = email
    this.token = token

    const myHeaders = new Headers()
    myHeaders.append('Authorization', 'Bearer ' + token)
    myHeaders.append('Content-Type', 'application/json')
    this.headers = myHeaders
  }

  makeRequestOptions(method, body = null) {
    return {
      method: method,
      headers: this.headers,
      redirect: 'follow',
      body: body
    }
  }

  async fetch(url, method = 'GET', body = null) {
    log('info', `req on ${url}: ${method} ${body}`)
    return await fetch(
      `${API_ROOT}/${url}`,
      this.makeRequestOptions(method, body)
    ).then(response => response.json())
  }

  async getCards() {
    return await this.fetch(`cards?wallet_result_level=full`)
  }

  async getOperations(card) {
    const reqRes = await this.fetch(
      `accounts/${card.class}-${card.account_ref}/operations`
    )
    return reqRes.filter(
      op => op.status === 'success' && op.cleared_status === 'cleared'
    )
  }

  async getAllOperations() {
    const cards = await this.getCards()
    await Promise.all(
      cards.map(async card => {
        card.operations = await this.getOperations(card)
        for (let op of card.operations) {
          op.card = card
        }
      })
    )
    return cards
  }
}

async function getBNPEREData(email, token) {
  const api = new BNPEREApi(email, token)
  return [await api.getCards(), await api.getAllOperations()]
}

module.exports = {
  getBNPEREData
}
