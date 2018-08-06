#!/usr/bin/env bash

# ensure we're on master
CURRENT_BRANCH=$(git symbolic-ref -q HEAD)
if [[ $CURRENT_BRANCH != "refs/heads/master" ]]; then
    echo
    echo This script only supports shipping from master.
    echo You are on $CURRENT_BRANCH.
    echo Checkout master and try again.
    exit 1
fi

# ensure the workdir is clean
if [ ! -z "$(git status --porcelain)" ]; then
    echo
    echo The working directory must be clean to use this script.
    echo Git says there are uncommitted changes.
    echo Commit your changes and try again.
    exit 2
fi

# ensure we can find npm
HAVE_NPM=$(which npm)
if [ -z "${HAVE_NPM}" ]; then
    echo
    echo Releasing requires npm.
    echo Could not find an npm installed.
    echo Install npm and try again.
    exit 3
fi

# get the user-settable parts of the version
SPRINT_ERA=139
SPRINT_EPOCH=$(date --date="2018-07-21 00:00:00 EDT" +%s)
RIGHT_NOW=$(date +%s)
let DELTA_SECONDS=$RIGHT_NOW-$SPRINT_EPOCH
let DELTA_WEEKS=$DELTA_SECONDS/604800
let DELTA_SPRINTS=$DELTA_WEEKS/3
let COMPUTED_SPRINT=$SPRINT_ERA+$DELTA_SPRINTS

read -p "Sprint (default: ${COMPUTED_SPRINT}): " RELEASE_SPRINT

# trim whitespace
# .. leading
RELEASE_SPRINT="${RELEASE_SPRINT#"${RELEASE_SPRINT%%[![:space:]]*}"}"
# .. trailing
RELEASE_SPRINT="${RELEASE_SPRINT%"${RELEASE_SPRINT##*[![:space:]]}"}" 

if [ -z $RELEASE_SPRINT ]; then
    RELEASE_SPRINT=$COMPUTED_SPRINT
fi

echo
echo Creating a release for sprint $RELEASE_SPRINT

# update the version number
NEW_VERSION_NUMBER="1.${RELEASE_SPRINT}.0"
RELEASE_BRANCH="releases/${RELEASE_SPRINT}"
PR_BRANCH="versionbump/${RELEASE_SPRINT}"

git checkout -b $PR_BRANCH

if [ $? -ne 0 ]; then
    echo
    echo Something went wrong creating the PR branch for this new version number.
    echo Discard changes, fix it, check out master, and try again.
    exit 4
fi

npm --no-git-tag-version version $NEW_VERSION_NUMBER
git add --all
git commit -m "Version bump to ${NEW_VERSION_NUMBER}"
echo
echo "Bumped version number and committed it to ${PR_BRANCH}"

# create a new releases/ branch
git branch $RELEASE_BRANCH
if [ $? -ne 0 ]; then
    echo
    echo Something went wrong creating the release branch for this new version number.
    echo There is nothing magical here; you can fix it by creating a branch called
    echo "${RELEASE_BRANCH} starting from ${PR_BRANCH}."
    exit 4
fi

echo "Also created ${RELEASE_BRANCH} for ongoing servicing in this branch"
echo
echo Next steps:
echo "- Push both branches to the main repo"
echo "- PR ${PR_BRANCH} into master"
