const puppeteer = require('puppeteer')
const { log } = require('cozy-konnector-libs')
const fs = require('fs')

const baseUrl = 'https://www.boursedirect.fr/fr'
const loginUrl = `${baseUrl}/login`
const walletUrl = `${baseUrl}/page/portefeuille`

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

    await page.goto(walletUrl)
    // wait for idle
    await page.waitForTimeout(1000)

    const getToken = async () =>
      await page.cookies().then(cookies => {
        return cookies.find(c => c.name === 'CAPITOL').value
      })

    let token = await getToken()

    try {
      await page.waitForFunction(`window.location.href === "${walletUrl}"`, {
        timeout: 1000
      })
    } catch (e) {
      log('info', 'Not logged in, logging in...')

      try {
        await page.click('#didomi-notice-agree-button')
      } catch (e) {
        //
      }

      await page.goto(loginUrl)

      await page
        .$('input[placeholder="Identifiant"]')
        .then(el => el.type(username))
      await page.$('input[type="password"]').then(el => el.type(password))

      await page.waitForTimeout(1000)

      // simulate "enter" key press in password input
      await page.keyboard.press('Enter')

      let start = Date.now()
      for (;;) {
        let newToken = await getToken()
        if (newToken && newToken !== token && !newToken.includes('-')) {
          token = newToken
          break
        }
        await page.waitForTimeout(1000)
        if (Date.now() - start > 40000) {
          await browser.close()
          throw new Error('Login timeout')
        }
      }
    }

    log('info', `Token value: ${token} `)
    await page.waitForTimeout(1000)

    await connector.notifySuccessfulLogin()

    await browser.close()
    return token
  }
}
