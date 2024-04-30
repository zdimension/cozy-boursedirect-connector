const { log } = require('cozy-konnector-libs');
const jsdom = require('jsdom');
jsdom.defaultDocumentFeatures = {
  QuerySelector: true
};
const { JSDOM } = jsdom;

const API_ROOT =
  'https://www.boursedirect.fr';

var originalColumns = new Array();
originalColumns['libelle'] = 0;
originalColumns['valorisation'] = 5;
originalColumns['pmvalues'] = 6;
originalColumns['varPRU'] = 7;
originalColumns['varVeille'] = 8;
originalColumns['percent'] = 9;

function makeFloat(text) {
  text = text.replace(/([^0-9\,-])/i, '');
  text = text.replace(/\,/i, '.');
  var rtnFloat = parseFloat(text);
  return ((isNaN(rtnFloat)) ? 0.0 : rtnFloat);
}

function parseData(message) {
  if (message == 'NULL' || message == '') { return false; }

  var rtnData = new Array();
  rtnData['portfolio'] = new Array();
  rtnData['assets'] = new Array();
  var assetCount = 0;
  var newAsset = true;
  var data = message.split('|');
  var regs1 = /\#/i;
  var regs2 = /\{/i;

  for (i = 0; i < data.length; i++) {
    if (i == 0) {
      data[i] = data[i].split('{');
      rtnData['portfolio'] = data[i];
    }
    else if (data[i] == '1') {
      data[i] = 'END';
      newAsset = true;
      assetCount++;
    }
    else {
      if (regs1.test(data[i])) data[i] = data[i].split('#');

      if (typeof data[i] == 'object') {
        for (j = 0; j < data[i].length; j++) {
          if (regs2.test(data[i][j])) data[i][j] = data[i][j].split('{');
        }
      }

      if (newAsset) {
        rtnData['assets'][assetCount] = new Array(
          data[i][originalColumns['libelle']],
          makeFloat(data[i][originalColumns['valorisation']]),
          makeFloat(data[i][originalColumns['pmvalues']]),
          makeFloat(data[i][originalColumns['varPRU']]),
          makeFloat(data[i][originalColumns['varVeille']]),
          makeFloat(data[i][originalColumns['percent']]),
          new Array(data[i])
        );

        newAsset = false;
      }
      else {
        rtnData['assets'][assetCount][6].push(data[i]);
        if (data[i][0] == 'Total') {
          rtnData['assets'][assetCount][2] = makeFloat(data[i][originalColumns['pmvalues']]);
        }
      }
    }
  }

  return rtnData;
}

class BourseDirectApi {
  constructor(token) {
    this.token = token;

    const myHeaders = new Headers();
    myHeaders.append('Cookie', 'CAPITOL=' + token);
    myHeaders.append('cache-control', 'no-cache');
    myHeaders.append('pragma', 'no-cache');
    myHeaders.append('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    this.headers = myHeaders;
  }

  makeRequestOptions(method, body = null) {
    return {
      method: method,
      headers: this.headers,
      redirect: 'follow',
      body: body
    };
  }

  async fetch(url, method = 'GET', body = null) {
    log('info', `req on ${url}: ${method} ${body} ${JSON.stringify(Array.from(this.headers))}`);
    return await fetch(
      `${API_ROOT}/${url}`,
      this.makeRequestOptions(method, body)
    ).then(response => response.text());
  }

  async getData() {
    // TODO: support multiple accounts by passing &nc=X where X is account id (1-indexed)
    // and maybe cc=1? 
    const data = await this.fetch('streaming/compteTempsReelCK.php?stream=0&nc=1');
    const parsed = parseData(data.substring("message='".length, data.length - 1));

    const id = parsed.portfolio[11]
    const accounts = [
      {
        id: `${id}-especes`,
        name: 'Espèces',
        balance: makeFloat(parsed.portfolio[3]),  
        valId: "especes"
      },
      ...parsed.assets.map(asset => ({
        id: `${id}-${asset[0].replace(/[ .]/g, '-')}`,
        name: asset[0],
        balance: asset[1],
        valId: asset[6][0][1][0].split("=")[1].split("&")[0] // e.g.: E:CW8
      }))
    ]

    const dataOp = await this.fetch('priv/new/historique-de-compte.php');
    const dom = new JSDOM(dataOp);
    const rows = dom.window.document.querySelectorAll(".datas tr[class]");

    const ops = [];

    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      const [d, m, y] = cells[0].textContent.split('/');
      const isoDate = `${y}-${m}-${d}T12:00:00.000Z`;
      const link = cells[2].querySelector('a');
      const amount = makeFloat(cells[6].textContent);
      const label = [cells[3].textContent.trim(), cells[2].textContent.trim()].join(' ');
      const opId = `${id}-${y}-${m}-${d}-${label.replace(/[ .]/g, '-')}-${Math.floor(amount)}`

      if (link === null) {
        ops.push({
          id: opId,
          date: isoDate,
          label: label,
          amount: amount,
          account: `${id}-especes`
        });
      } else {
        ops.push({
          id: `${opId}-1`,
          date: isoDate,
          label: label,
          amount: amount,
          account: `${id}-especes`
        });
        const valId = link.href.split("=")[1].split("&")[0];
        ops.push({
          id: `${opId}-2`,
          date: isoDate,
          label: label,
          amount: -amount,
          account: accounts.find(a => a.valId === valId).id
        });
      }
    }

    return [
      accounts,
      ops
    ];
  }
}


async function getBourseDirectData(token) {
  const api = new BourseDirectApi(token);
  return await api.getData();
}

module.exports = {
  getBourseDirectData
};
