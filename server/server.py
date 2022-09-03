from itertools import chain
from dotenv import load_dotenv
load_dotenv()
from .api import icfpc as ICFPC
from flask import Flask, request, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

os.path.basename(__file__)

@app.route("/")
def ping():
    return "pong"

@app.post("/check-auth")
def post_check_auth():
    return ICFPC.check_auth()

@app.get("/problems/<id>")
def get_problem(id):
    return send_from_directory('../problems', id+'.png')

@app.get("/problems/")
def get_problems():
    problems_dir = os.path.dirname(__file__)+'/../problems'
    problems_files = os.listdir(problems_dir)
    problems = sorted([int(p.rstrip('.png')) for p in problems_files if '.png' in p])
    return { 'problems': problems }

@app.get("/solutions")
@app.get("/solutions/")
def get_solutions():
    solutions_dir = os.path.dirname(__file__)+'/../solutions'
    # print (solutions_dir)
    solutions_folders_with_files = []
    for path, folders, files in os.walk(solutions_dir):
        # print (path, folders, files)
        solutions_folders_with_files.append((path.removeprefix(solutions_dir + '/'), files))
    solutions = []
    for path, files in solutions_folders_with_files:
        for file in files:
            solutions.append(path+'/'+file if path else file)
    return { 'solutions': sorted(solutions) }

@app.get("/solutions/<path:path>")
def get_solution(path):
    return send_from_directory('../solutions', path)

@app.post("/submit")
def post_submit():
    payload = request.get_json()
    problem = payload.get('problem')
    solution = payload.get('solution')
    assert problem, 'Required input: problem'
    assert solution, 'Required input: solution'
    return ICFPC.submit(problem, solution)


@app.errorhandler(Exception)
def unhandled_error(error):
    print(error, error.code)
    return str(error), getattr(error, 'code', 500)
