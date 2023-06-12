# Green PRs Action

Automatically re-run failed GH action workflow runs for a configurable set of PRs


## Example

```yaml
on:
  schedule:
    - cron:  '0 * * * *'

jobs:
  re-run-failed-renovate:
    runs-on: ubuntu-latest
    steps:
      - name: Re-run failed renovate bot PRs
        uses: stellaservice/green-prs-action@v1
        with:
          workflow: 'pull-request.yaml'
          pr_title_filter_pattern: '^chore\(deps\):'
          pr_base_branch: master
          max_attempts: 3
```
