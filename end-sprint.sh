#!/usr/bin/env bash

# ensure we're on master
CURRENT_BRANCH=$(git symbolic-ref -q HEAD)
if [[ $CURRENT_BRANCH != "refs/heads/master" ]]; then
    echo
    echo You need to be on master to finish a sprint.
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
    echo This requires npm.
    echo Could not find an npm installed.
    echo Install npm and try again.
    exit 3
fi

# confirm the version we're shipping
SPRINT_NUMBER=$(node -p "require('./package.json').version.split('.')[1]")

echo "Finish sprint ${SPRINT_NUMBER}?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) break;;
        No ) exit;;
    esac
done

# create a new releases/ branch
RELEASE_BRANCH="releases/${SPRINT_NUMBER}"
git branch $RELEASE_BRANCH

if [ $? -ne 0 ]; then
    echo
    echo Something went wrong creating the release branch for this new version number.
    echo There is nothing magical here; you can fix it by creating a branch called
    echo "${RELEASE_BRANCH} and pushing it to origin."
    exit 4
fi

git push -u origin ${RELEASE_BRANCH}

if [ $? -ne 0 ]; then
    echo
    echo Something went wrong pushing the release branch to origin.
    echo Fix it and push again.
    echo DO NOT MERGE THIS BRANCH BACK TO MASTER.
    exit 5
fi

echo
echo "Pushed ${RELEASE_BRANCH} to origin"
echo DO NOT MERGE THIS BRANCH BACK TO MASTER.
echo
echo Next step: checkout master and run start-sprint.sh for the next sprint.