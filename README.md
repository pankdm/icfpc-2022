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

# Script to send solutions

```
python3 -m src.submit_folder FOLDER
```

# Local server + UI

Install deps, if not yet
```bash
make
```

Start local server

```bash
make start-server
```

Test connection to ICFPC submissions server

```bash
curl -X POST localhost:5000/check-auth
```

Start UI in separate terminal
```bash
make start-ui
```

Run cut optimizer on a solution:

```bash
java -jar optimizer/optimizer.jar <solution.txt> <optimized_solution_out.txt> <target.png> [<initial state json>]

java -jar optimizer/optimizer.jar solutions/manual_robot/9k/2.txt solutions/manual_robot/9k/2.opt.txt problems/2.png

java -jar optimizer/optimizer.jar solutions/manual_fourdman/35.txt solutions/manual_fourdman/35.opt.txt problems/35.png problems/35.initial.json
```

Building cut optimizer:
```bash
cd optimizer
mvn package

# optimizer/target/optimizer.jar
```

Run optimizer on all problems then submit
```
make jar
bash src/run_optimizer.sh
python3 -m src.submit_folder solutions/optimized
```

Generate all previews:
```
make previews
```
