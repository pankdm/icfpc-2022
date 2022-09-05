PYTHON              := python3
PIP                 := pip3
FLASK               := ${PYTHON} -m flask
EXPORT_PYTHONPATH   := export PYTHONPATH="$(shell pwd)";

.PHONY: previews

install:
	${PIP} install -r requirements.txt; cd ui; yarn;

start-ui:
	cd ui; yarn dev

start-server:
	${EXPORT_PYTHONPATH} ${FLASK} --app server/server --debug run --port=8000

repl:
	${EXPORT_PYTHONPATH} ${PYTHON} -i repl.py

download:
	${EXPORT_PYTHONPATH} ${PYTHON} -m src.download_best

jar:
	cd optimizer; mvn package

previews: jar
	bash src/generate_all_previews.sh
