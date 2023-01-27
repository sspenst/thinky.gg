# CHANGELOG

## 4.0.1 (12/15/2022)
 * Fixed an issue where logging non-standard error objects under the err key causes APM to throw.

## 4.0.0 (07/27/2022)

* **BREAKING** Removed support for Node 12.

  The minimum supported version is now Node v14. For further information on our support policy, see: https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent.

* Added support for Node 18.
* Resolved several dev-dependency audit warnings.

## 3.2.0 (06/07/2022)

 * Restored package to only handle log enrichment and not application logging. If you want to get logs in context automatically forwarded you can use Node.js agent version v8.13.0 or later.

## 3.1.1 (05/11/2022)

**BREAKING**:  Updated the signature to require passing in the winston package instead of relying on it being a peer dependency.

Before:

```js
const newrelicFormatter = require('@newrelic/winston-enricher')

format: winston.format.combine(
  winston.format.label({label: 'test'}),
  newrelicFormatter()
)
```

Now:

```js
const nrWinstonEnricher = require('@newrelic/winston-enricher')
const newrelicFormatter = nrWinstonEnricher(winston)


format: winston.format.combine(
  winston.format.label({label: 'test'}),
  newrelicFormatter()
)
```

 * Added support for new application logging for the Node.js agent
   * facilitate agent log forwarding
   * local log decorating
   * agent supportability metrics around usage
   * log enrichment
 * Added logic to prevent double logging with agent application log forwarding and log enrichment.
 * Handled case where customer upgrades agent and log enricher will continue to function without any changes.
 * Updated formatter to favor application log forwarding when both application log forwarding and application local log decorating are both enabled.
 * Dev-only npm audit fixes.
 * Bumped tap to ^16.0.1.
 * Bumped @newrelic/test-utilities ^6.5.3.
 * Fixed third-party notice generation.

## 3.1.0 (05/05/2022)

 * This release has been deprecated. Please use version 3.1.1 or higher.

## 3.0.0 (04/28/2022)

* This release has been deprecated. Please use version 3.1.1 or higher.

## 2.1.1 (04/05/2022)

* Made Winston a peer dependency.

## 2.1.0 (10/20/2021)

* Added TypeScript types.
* Upgraded setup-node CI job to v2 and changed the linting node version to lts/* for future proofing.
* Added @newrelic/eslint-config to rely on a centralized eslint ruleset.
* Updated issue templates for consistency with our other repositories.
*  Added a pre-commit hook to check if package.json changes and run `oss third-party manifest` and `oss third-party notices`.  This will ensure the `third_party_manifest.json` and `THIRD_PARTY_NOTICES.md` are up to date.
* Added a pre-commit hook to run linting via huskey.

## 2.0.0 (07/20/2021)

**BREAKING** Removed support for Node 10.

  The minimum supported version is now Node v12. For further information on our support policy, see: https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent.

* Added support for Node 16.
* Added files list instead of `.npmignore` to specify module contents.
* Added `workflow_dispatch` to CI workflow to allow manual triggers.
* Bumped `@newrelic/test-utilities` to ^5.1.0.
* Bumped `tap` to ^15.0.9.
* Update `newrelic` dev dependency to >= 7.x.

## 1.0.0 (11/02/2020)

* Fixed several bugs where the formatter would have unexpected results when the agent is disabled. Fixes include:
  * Now always logs via JSON format.
  * Does not modify original content when the agent is disabled.
  * Does not crash with the existence of a timestamp field when the agent is disabled.
* Added module load support metric.
* Breaking: Moved agent dependency to be a peer dependency. It is now required the leveraging application install 'newrelic' directly.
  * This prevents attempts to load multiple copies of the agent. Previously, when an application referenced 'newrelic' the formatter would attempt to load a second copy of the agent. The agent protects against this behavior but it is preferred we avoid this. Also, the prior dependency was too restrictive and would have pinned the formatters version to 6.x versions of the agent.
* Removed Node v8 from CI.
* Added Node 14 to CI.
* Update README for consistency with New Relic OSS repositories.
* Remove Code of Conduct doc and link to New Relic org.
* Added Open Source Policy Workflow.
* Bumped node-test-utilities version to ^4.0.0.
* Updated third party notices including new footer language.
* Modifies default branch name wording in contributing guide.
* Migrated CI to GitHub Actions from CircleCI.

## 0.1.1 (02/14/2020)

* Handle getLinkingMetadata not returning an object.

## 0.1.0 (11/26/2019)

* Initial release of log formatter.
