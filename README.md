[Cozy][cozy] BNPERE Konnector
=======================================

What's Cozy?
------------

![Cozy Logo](https://cdn.rawgit.com/cozy/cozy-guidelines/master/templates/cozy_logo_small.svg)

[Cozy] is a personal data platform that brings all your web services in the same private space. With it, your webapps and your devices can share data easily, providing you with a new experience. You can install Cozy on your own hardware where no one's tracking you.

What is this konnector about ?
------------------------------

This konnector retrieves your banking data (cards and operations) from your BNPERE account.

### Run and test

Create a `konnector-dev-config.json` file at the root with your test credentials :

```javascript
{
  "COZY_URL": "http://cozy.tools:8080",
  "fields": {"login":"zuck.m@rk.fb", "password":"123456"}
}
```
Then :

```sh
yarn
yarn standalone
```
For running the konnector connected to a Cozy server and more details see [konnectors tutorial](https://docs.cozy.io/en/tutorials/konnector/)

If everything works, you can run `yarn dev`.

#### "text is not iterable"

No idea why, but you need to delete node_modules\cozy-jobs-cli\node_modules.

### Cozy-konnector-libs

This connector uses [cozy-konnector-libs](https://github.com/cozy/cozy-konnector-libs). It brings a bunch of helpers to interact with the Cozy server and to fetch data from an online service.

### Maintainer

The lead maintainer for this konnector is @zdimension.


### Get in touch

You can reach the Cozy Community by:

- [Konnectors tutorial](https://docs.cozy.io/en/tutorials/konnector/)
- Chatting with us on IRC [#cozycloud on Libera.Chat][libera]
- Posting on our [Forum]
- Posting issues on the [Github repos][github]
- Say Hi! on [Twitter] or [Mastodon]


License
-------

cozy-bnpere-connector is developed by @zdimension and distributed under the [AGPL v3 license][agpl-3.0].

Bits taken from [cozy-konnector-boursorama](https://github.com/konnectors/boursorama) and [cozy-plutus-connector](https://github.com/Guekka/cozy-plutus-connector).

[cozy]: https://cozy.io "Cozy Cloud"
[agpl-3.0]: https://www.gnu.org/licenses/agpl-3.0.html
[libera]: https://web.libera.chat/#cozycloud
[forum]: https://forum.cozy.io/
[github]: https://github.com/cozy/
[nodejs]: https://nodejs.org/
[standard]: https://standardjs.com
[twitter]: https://twitter.com/cozycloud
[mastodon]: https://framapiaf.org/@CozyCloud
[webpack]: https://webpack.js.org
[yarn]: https://yarnpkg.com
[travis]: https://travis-ci.org
[contribute]: CONTRIBUTING.md
