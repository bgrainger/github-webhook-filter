# GitHub Webhook Filter

`github-webhook-filter` is a GitHub webhook that forwards webhook events to an arbitrary target,
unless the event type or data is blocked.

This is useful for sending most `push` events to Flowdock except ones that happen on a specific
branch.

## How to Use

### GitHub Enterprise

At https://git/Logos/YourRepoName/settings, choose "Webhooks and Services".

Click "Add Webhook":
* Payload URL: http://github-webhook-filter.lrscorp.net:4001/{arbitrary}?target=url-encoded-target-uri
  * `{arbitrary}` can be an arbitrary path that's useful for distinguishing these hooks in the GitHub settings UI
* Content type: application/json
* Secret: (blank)
* Send me **everything**

Click "Add webhook"

## Requirements

* [GitHub Enterprise](https://enterprise.github.com/)
* [NodeJS](https://nodejs.org/)

## Installation

### Server

Apply the `github-webhook-filter_server` puppet class to the node and run
`puppet apply -t`.

To restart the service, run `svcadm restart github-webhook-filter`.

### Deployment

Add a "deploy" git remote: `git remote add deploy ssh://desk-dev-util01.lrscorp.net/usr/local/src/github-webhook-filter.git`

To deploy the code: `git push deploy master`
