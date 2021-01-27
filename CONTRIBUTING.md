Note: This is still a work in progress. Some parts of this file are not finalized and are kept outside of the project.

# Branch naming guidelines and Pull Requests

Branches are expected to follow the git flow naming scheme:
- `feature/<name>`
- `bugfix/<name>`
- `hotfix/<name>`

Make sure that the base for PRs is set to ``develop`` for features and ``master`` or ``develop`` for hotfixes or bugfixes.

Maintainer Note - Make sure to merge hotfixes and bugfixes manually with `--no-ff` into both master and develop. See https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow for more detail.

# Commit Message Guidelines

*Note: These guidelines are based on the [guidelines used by Angular](https://github.com/angular/angular/blob/master/CONTRIBUTING.md)*

Each commit message consists of a header, a body and a footer. The header has a special format that includes a type and a subject:

```
<type>: <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory. The **body** is optional. The **footer** is temporarily forbidden.

The **subject**, **body** and **footer** may be split over any number of lines, but they must not contain any blank lines (in order to make it clear where each section begin and end).

Any line of the commit message MUST NOT be longer than 73 characters!

## Type

Must be one of the following:

* **build**: Changes that affect the build system or external dependencies (for example: editing ``package.json``, ``gulpfile.js`` or ``.eslintrc.json``)
* **docs**: Documentation only changes
* **feat**: A new feature
* **fix**: A bug fix
* **github**: Changes to our GitHub CI configuration files or scripts
* **perf**: A code change that improves performance
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
* **test**: Adding missing tests or correcting existing tests

## Body

Just as in the subject, use the imperative, present tense: "change" not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior.

## Footer

The footer is **RESERVED** and must not be included in any commit.
