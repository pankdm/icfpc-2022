PYTHON              := python3
PIP                 := pip3
FLASK               := ${PYTHON} -m flask
EXPORT_PYTHONPATH   := export PYTHONPATH="$(shell pwd)";

install:
	${PIP} install -r requirements.txt

start-server:
	${EXPORT_PYTHONPATH} ${FLASK} --app server/server --debug run

repl:
	${EXPORT_PYTHONPATH} ${PYTHON} -i repl.py
