PYTHON          := python
PIP             := pip
FLASK           := ${PYTHON} -m flask

install:
	${PIP} install -r requirements.txt

start-server:
	${FLASK} --app server/server --debug run

repl:
	${PYTHON} -i repl.py
