from dotenv import load_dotenv
load_dotenv()
from .api import icfpc as ICFPC
from flask import Flask, request

app = Flask(__name__)

@app.route("/")
def ping():
    return "pong"

@app.post("/check-auth")
def post_check_auth():
    return ICFPC.check_auth()

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
    return str(error), 500
    # return "something broke!", 500
