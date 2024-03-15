const puppeteer = require('puppeteer')
const { log } = require('cozy-konnector-libs')
const fs = require('fs')

const baseUrl = 'https://monepargne.ere.bnpparibas'
const walletUrl = `${baseUrl}/accueil`

module.exports = {
  getToken: async function (connector, username, password) {
    log('info', 'Get token')
    let dataDir = `./data/${username}`
    // create data dir if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir)
    }
    let browser = await puppeteer.launch({
      headless: false,
      userDataDir: dataDir
    })
    let page = await browser.newPage()

    let access_token = null

    page.on('response', async response => {
      const req = response.request()
      // check if there's an Authorization header
      const authHeader = req.headers()['authorization']
      if (authHeader) access_token = authHeader.split(' ')[1].trim()
      else if (response.url().endsWith('/token'))
        access_token = (await response.json()).access_token
    })

    await page.goto(walletUrl)
    // wait for idle
    await page.waitForTimeout(1000)
    try {
      await page.waitForFunction(`window.location.href === "${walletUrl}"`, {
        timeout: 5000
      })
    } catch (e) {
      log('info', 'Not logged in, logging in...')
      try {
        const onetrust = '.save-preference-btn-handler'
        const onetrustBtn = await page.waitForSelector(onetrust, {
          timeout: 1000
        })
        log('info', 'Cookies')

        if (onetrustBtn !== null) {
          await Promise.all([page.waitForNetworkIdle(), page.click(onetrust)])
        }
      } catch (e) {
        //
      }
      // original auth code from @Guekka

      // find element with text "Je me connecte" and click on it
      const logbtn = await page.waitForSelector('::-p-text(Je me connecte)', {
        timeout: 20000
      })
      await Promise.all([page.waitForNavigation(), logbtn.click()])

      await page
        .$('input[placeholder="Adresse e-mail"]')
        .then(el => el.type(username))
      await page.$('input[type="password"]').then(el => el.type(password))

      await page.waitForTimeout(1000)

      await page
        .waitForSelector('::-p-text(Se connecter)', { timeout: 20000 })
        .then(el => el.click())
      await page.waitForFunction(`window.location.href === "${walletUrl}"`, {
        timeout: 40000
      })
    }

    // periodically check if we have the token
    while (!access_token) {
      await page.waitForTimeout(1000)
    }

    log('info', `Token value: ${access_token} `)

    await connector.notifySuccessfulLogin()

    await browser.close()
    return access_token
  }
}
