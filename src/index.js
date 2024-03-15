const {
  log,
  cozyClient,
  BaseKonnector,
  categorize
} = require('cozy-konnector-libs')
const { getBNPEREData } = require('./bnpere')
const { getToken } = require('./auth')
const doctypes = require('cozy-doctypes')
const { Document, BankAccount, BankTransaction, BankingReconciliator } =
  doctypes

Document.registerClient(cozyClient)

const minilog = require('@cozy/minilog')
minilog.suggest.allow('cozy-client', 'info')

const reconciliator = new BankingReconciliator({ BankAccount, BankTransaction })

class BNPEREConnector extends BaseKonnector {
  async fetch(fields) {
    if (process.env.NODE_ENV !== 'standalone') {
      cozyClient.new.login()
    }

    if (this.browser) {
      await this.browser.close()
    }
    try {
      const token = await getToken(this, fields.login, fields.password)
      const [cards, ops] = await getBNPEREData(fields.login, token)

      log('info', 'Successfully fetched data')
      log('info', 'Parsing ...')

      const accounts = this.parseAccounts(cards)
      const operations = this.parseOps(ops)

      const categorizedTransactions = await categorize(operations)
      const { accounts: savedAccounts } = await reconciliator.save(
        accounts,
        categorizedTransactions
      )

      log('info', savedAccounts)
    } catch (e) {
      log('error', e)
      log('error', e.stack)
    }
  }

  parseAccounts(cards) {
    return cards.map(card => {
      const full_id = `${card.company}999${card.planID}`
      return {
        vendorId: full_id,
        number: full_id,
        currency: 'EUR',
        institutionLabel: 'BNP Paribas Épargne Salariale',
        label: card.name,
        balance: card.totalAmount,
        type: 'Savings'
      }
    })
  }

  parseOps(ops) {
    return ops.map(op => {
      const full_id = `${op.company}999${op.card}`;
      const date = op.dateTime + '.000Z'
      return {
        vendorId: op.id,
        vendorAccountId: full_id,
        amount: op.amount,
        date: date,
        dateOperation: date,
        dateImport: new Date().toISOString(),
        currency: 'EUR',
        label: op.label,
        originalBankLabel: op.label
      }
    })
  }
}

const connector = new BNPEREConnector({
  cheerio: false,
  json: false
})

connector.run()
