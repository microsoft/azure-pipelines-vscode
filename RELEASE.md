# Releasing the extension

## First time each sprint

Run `prepare-sprint-release.sh` in a bash window.
This will ask you to confirm the sprint number, bump the version number, and create two branches.
You need to push those branches up to GitHub.
PR the one under versionbump/* into master.
The one under releases/* should never go back to master.

## Subsequent point releases

**TODO**: come up with a better strategy.

In your local copy of the repo, run `npm --no-git-tag-version version patch` to increment the patch version.
