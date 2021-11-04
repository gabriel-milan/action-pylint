# Pylint action

Runs pylint and sends errors in a PR message.

## Usage

Values below are the defaults.

```yaml
on: pull_request

jobs:
  example:
    runs-on: ubuntu-latest
    name: Executes pylint
    steps:
      - name: Checkout
        uses: actions/checkout@v1

      - name: Lint
        uses: gabriel-milan/action-pylint@v1
        with:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}} # GitHub token
          path: "./*.py" # Glob pattern for files to lint
          fail: true # Fail the action if pylint errors are found
          pr-message: true # Send a PR message if pylint errors are found
```
