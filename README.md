# Setup

Install python packages

```bash
pip3 install -r requirements.txt

# or simply

make
```

Create `.env` file with following contents

```
ICFPC_USER_EMAIL="team@email.com"
ICFPC_USER_PASSWORD="password"
```

## Pyenv

If using `pyenv` + `pyenv virtualenv`, consider using env init script

```bash
./pyenv-init.sh
```

# REPL

There is a pre-configured local REPL init script, that provides handy namespaces.

```bash
$ make repl
```

# Local submission server

```bash
make start-server
```

Then test connection to ICFPC submissions server

```bash
curl -X POST localhost:5000/check-auth
```

To submit solutions
```bash
curl -X POST localhost:5000/submit -H 'Content-Type: application/json' --data '{"problem": "-10", "solution": "... file content as single string ..."}'
```

# Script to send solutions:

```
python3 -m src.submit_folder FOLDER
```
