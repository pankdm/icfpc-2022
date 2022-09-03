import os
from flask_cors import CORS
from flask import Flask, request, send_from_directory
from .api import icfpc as ICFPC
from itertools import chain
from dotenv import load_dotenv
import solver.geometric_median as gm
from PIL import Image
import numpy as np

load_dotenv()

app = Flask(__name__)
CORS(app)

os.path.basename(__file__)

IMG_CACHE = {}

def open_image_as_np(n):
    global IMG_CACHE

    if n in IMG_CACHE:
        return IMG_CACHE[n]

    img = Image.open(f"./problems/{n}.png")
    a = np.asarray(img)
    result = a[::-1, :].swapaxes(0, 1)
    IMG_CACHE[n] = result
    return result

@app.route("/")
def ping():
    return "pong"


@app.post("/check-auth")
def post_check_auth():
    return ICFPC.check_auth()


@app.get("/problems/<id>")
def get_problem(id):
    return send_from_directory('../problems', id+'.png')


@app.get("/problem_initial_states/<id>")
def get_problem_initial_state(id):
    if os.path.exists(f'./problems/{id}.initial.json'):
        return send_from_directory('../problems', id+'.initial.json')
    else:
        return {
            "width": 400,
            "height": 400,
            "blocks": [
                {
                    "blockId": "0",
                    "bottomLeft": [0, 0],
                    "topRight": [400, 400],
                    "color": [255, 255, 255, 255]
                }]
        }

@app.post("/geometric_median")
def get_geometric_median():
    payload = request.get_json()
    id = payload["id"]
    x1, x2, y1, y2 = payload["x1"], payload["x2"], payload["y1"], payload["y2"]
    img = open_image_as_np(id)
    subimg = img[x1:x2, y1:y2]

    print(f"{img}")

    color = [round(v) for v in gm.geometric_median(
            subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=1e-2)]
    return {'color': color}

@app.get("/problems")
@app.get("/problems/")
def get_problems():
    problems_dir = os.path.dirname(__file__)+'/../problems'
    problems_files = os.listdir(problems_dir)
    problems = sorted([int(p.rstrip('.png'))
                      for p in problems_files if '.png' in p])
    return {'problems': problems}


@app.get("/solutions")
@app.get("/solutions/")
def get_solutions():
    solutions_dir = os.path.dirname(__file__)+'/../solutions'
    # print (solutions_dir)
    solutions_folders_with_files = []
    for path, folders, files in os.walk(solutions_dir):
        # print (path, folders, files)
        solutions_folders_with_files.append(
            (path[len(solutions_dir + '/'):], files))
    solutions = []
    for path, files in solutions_folders_with_files:
        for file in files:
            solutions.append(path+'/'+file if path else file)
    return {'solutions': sorted(solutions)}


@app.get("/solutions/<path:path>")
def get_solution(path):
    print(path)
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
    print(error)
    return str(error), getattr(error, 'code', 500)
