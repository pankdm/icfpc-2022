# Local submission server

## Prerequisites
  1. Python

## Pyenv

If using `pyenv` + `pyenv virtualenv`, consider using env init script
```
./pyenv-init.sh
```

Create `.env` file with following contents

```
ICFPC_USER_EMAIL="team@email.com"
ICFPC_USER_PASSWORD="password"
```

## Install

Just run make

```
make
```

## Run server

```
make server
```

Then test connection to ICFPC submissions server

```
curl -X POST localhost:5000/check-auth
```
