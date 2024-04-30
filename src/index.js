const {
  log,
  cozyClient,
  BaseKonnector,
  categorize
} = require('cozy-konnector-libs')
const { getBourseDirectData } = require('./boursedirect')
const { getToken } = require('./auth')
const doctypes = require('cozy-doctypes')
const { Document, BankAccount, BankTransaction, BankingReconciliator } =
  doctypes

Document.registerClient(cozyClient)

const minilog = require('@cozy/minilog')
minilog.suggest.allow('cozy-client', 'info')

const reconciliator = new BankingReconciliator({ BankAccount, BankTransaction })

class BourseDirectConnector extends BaseKonnector {
  async fetch(fields) {
    if (process.env.NODE_ENV !== 'standalone') {
      cozyClient.new.login()
    }

    if (this.browser) {
      await this.browser.close()
    }
    try {
      const token = await getToken(this, fields.login, fields.password)
      const [cards, ops] = await getBourseDirectData(token)

      log('info', 'Successfully fetched data')
      log('info', 'Parsing ...')

      const accounts = this.parseAccounts(cards)
      log('info', JSON.stringify(accounts))
      const operations = this.parseOps(ops)
      log('info', JSON.stringify(operations))

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
      return {
        vendorId: card.id,
        number: card.id,
        currency: 'EUR',
        institutionLabel: 'Bourse Direct',
        label: card.name,
        balance: card.balance,
        type: 'Savings'
      }
    })
  }

  parseOps(ops) {
    return ops.map(op => {
      return {
        vendorId: op.id,
        vendorAccountId: op.account,
        amount: op.amount,
        date: op.date,
        dateOperation: op.date,
        dateImport: new Date().toISOString(),
        currency: 'EUR',
        label: op.label,
        originalBankLabel: op.label
      }
    })
  }
}

const connector = new BourseDirectConnector({
  cheerio: false,
  json: false
})

connector.run()
