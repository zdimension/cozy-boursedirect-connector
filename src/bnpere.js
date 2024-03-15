const { log } = require('cozy-konnector-libs')

const API_ROOT =
  'https://monere-api.epargne-retraite-entreprises.bnpparibas.com/api/v1'

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

  async getCompanies() {
    return (await this.fetch('companies')).companies
  }

  async getAllOperations(company) {
    const rawOps = (await this.fetch(`companies/${company}/operations`)).filter(
      op => op.statusCode === 'Termine'
    )
    log('info', JSON.stringify(rawOps))
    
    await Promise.all(
      rawOps.map(async op => {
        const detail = await this.fetch(`companies/${company}/operations/detail/${op.id}`)
        const plans = detail.destination.plans
        if (plans.length !== 1) {
          log('warn', `Unexpected number of plans: ${plans.length} for op ${op.id}`)
          return;
        }
        const plan = plans[0]
        op.company = company
        op.card = plan.planId
      })
    )
    return rawOps
  }
}

async function getBNPEREData(email, token) {
  const api = new BNPEREApi(email, token)
  const companies = await api.getCompanies()
  return [
    companies.flatMap(c => {
      return c.plans.map(p => {
        p.company = c.companyId
        return p
      })
    }),
    (await Promise.all(companies.map(async c => {
      return await api.getAllOperations(c.companyId)
    }))).flat()
  ]
}

module.exports = {
  getBNPEREData
}
