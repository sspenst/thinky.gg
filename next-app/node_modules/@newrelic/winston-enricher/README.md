[![Community Plus header](https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png)](https://opensource.newrelic.com/oss-category/#community-plus)

# @newrelic/winston-enricher

New Relic's official `winston` log enricher for use with the
[Node Agent](https://github.com/newrelic/node-newrelic).

The `winston-enricher` log format adds additional app, distributed trace and span information output as JSON-formatted log messages. This is most commonly used with the New Relic Logs product.

For the latest information, please see [the New Relic docs](https://docs.newrelic.com/docs/logs/new-relic-logs/enable-logs-context/enable-logs-context-apm-agents).

## Installation

```bash
npm install @newrelic/winston-enricher
```

## Usage

```js
// index.js
const newrelicFormatter = require('@newrelic/winston-enricher')
const winston = require('winston')
const newrelicWinstonFormatter = newrelicFormatter(winston)
```

The New Relic formatter can be used individually or combined with other
formatters as the final format.

```js
format: winston.format.combine(
  winston.format.label({label: 'test'}),
  newrelicWinstonFormatter()
)
```

**Note for unhandledException log messages:**

The stack trace will be written to the `error.stack` property.

To accommodate the New Relic Logs 4000 character log line limit, the `stack` and `trace` properties will be removed and the `message`, `error.message` and `error.stack` values will be truncated to 1024 characters.

### Version Requirements

`winston` versions 3.0.0 and greater are supported.

For more information, including currently supported Node versions, please see the agent [compatibility and requirements](https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent).

For general agent setup, please see the agent [installation guide](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent).

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

**Support Channels**

* [New Relic Documentation](https://docs.newrelic.com/docs/logs/enable-log-management-new-relic/logs-context-nodejs/nodejs-configure-winston): Comprehensive guidance for using our platform
* [New Relic Community](https://discuss.newrelic.com/t/node-log-enrichers-logs-in-context/88806): The best place to engage in troubleshooting questions
* [New Relic Developer](https://developer.newrelic.com/): Resources for building a custom observability applications
* [New Relic University](https://learn.newrelic.com/): A range of online training for New Relic users of every level
* **[For Community Plus repositories]** [New Relic Technical Support](https://support.newrelic.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.newrelic.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Contribute

We encourage your contributions to improve New Relic's Node.js logging extensions! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To all contributors, we thank you!  Without your contribution, this project would not be what it is today.  We also host a community project page dedicated to [New Relic Node.js logging extensions](https://opensource.newrelic.com/projects/newrelic-node-log-extensions).

## License
The New Relic Node.js loggin extensions are licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
