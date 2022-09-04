from concurrent.futures import ThreadPoolExecutor
import os
from flask_cors import CORS
from flask import Flask, request, send_from_directory

from solver.pixel2 import PixelSolver2
from .api import icfpc as ICFPC
from itertools import chain
from dotenv import load_dotenv
import solver.geometric_median as gm
from PIL import Image
import numpy as np
import solver.binar_solver as binary_solver

from os import listdir
from os.path import isfile, join

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

@app.get("/problems_start/<id>")
def get_problem_start(id):
    return send_from_directory('../problems', id+'.initial.png')



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

    color = [round(v) for v in gm.geometric_median(
        subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=1e-2)]
    return {'color': color}


@app.post("/run_solver")
def post_run_solver():
    payload = request.get_json()
    problem_id = payload["problem_id"]
    block_id = payload["block_id"]
    x1, x2, y1, y2 = payload["x1"], payload["x2"], payload["y1"], payload["y2"]
    initial_color = payload["initial_color"]

    img = open_image_as_np(problem_id)
    solver = binary_solver.Solver(ref_img=img, max_depth=4, initial_blocks=[])
    program = solver.improve(
        block_id=block_id,
        sp=binary_solver.Shape(x1, y1, x2, y2),
        current_color=initial_color,
        depth=0)

    return {'cmds': program.cmds}

@app.post("/run_pixel_solver")
def post_run_pixel_solver():
    payload = request.get_json()
    print('>>>', payload)
    problem_id = payload["problem_id"]
    pixel_size = payload["pixel_size"]
    block_id = payload["block_id"]
    args = { 'problem': problem_id }
    if pixel_size:
        args['pixel_size'] = int(pixel_size)
    if block_id:
        args['start'] = int(block_id)

    solver = PixelSolver2(**args)
    solver.run()

    return {'cmds': solver.prog }


@app.get("/problems")
@app.get("/problems/")
def get_problems():
    problems_dir = os.path.dirname(__file__)+'/../problems'
    problems_files = os.listdir(problems_dir)
    problems = sorted([int(p.rstrip('.png'))
                      for p in problems_files if '.png' in p and '.initial' not in p])
    pool = ThreadPoolExecutor(max_workers=5)
    user_stats_future = pool.submit(ICFPC.get_cached_results_user)
    # submissions_future = pool.submit(ICFPC.get_cached_submissions)
    pool.shutdown()
    user_stats = user_stats_future.result()
    # submissions = submissions_future.result()
    problems = user_stats['results']
    return { 'problems': problems }


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


@app.get("/best_solutions/<path:path>")
def get_best_solution(path):
    print('get_best_solution::', path)
    solutions_dir = os.path.dirname(__file__)+'/../best_solutions'
    timestamps = os.listdir(solutions_dir)
    last_ts = max(timestamps)
    print (last_ts)

    for solution in os.listdir(f"{solutions_dir}/{last_ts}"):
        if solution.startswith(f"{path}_"):
            print ('Best = ', solution)
            return send_from_directory(f"{solutions_dir}/{last_ts}", solution)
    return ""





@app.post("/submit")
def post_submit():
    payload = request.get_json()
    problem = payload.get('problem')
    solution = payload.get('solution')
    assert problem, 'Required input: problem'
    assert solution, 'Required input: solution'
    return ICFPC.submit(problem, solution)

@app.get('/icfpc/<path:path>')
def get_icfpc_endpoint(path):
    result = ICFPC.proxy_get_endpoint(path)
    return result

@app.errorhandler(Exception)
def unhandled_error(error):
    print(error)
    return str(error), getattr(error, 'code', 500)
