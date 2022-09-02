#!/bin/bash

# brew upgrade pyenv pyenv-virtualenv
# pyenv install 3.9.10
echo '-> Creating pyenv'
pyenv virtualenv 3.9.10 icfpc-2022

echo '-> Exporting "icfpc-2022" to .python-version'
echo icfpc-2022 > .python-version

echo '-> Updating pip'
pip install --upgrade pip
