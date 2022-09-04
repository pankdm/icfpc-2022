from dataclasses import dataclass
from datetime import datetime, timezone
from dateutil.parser import parse as dateparse
from ..utils import cached
import os
import requests
import requests.auth

from time import time 
import os
from collections import defaultdict


API_ROOT = 'https://robovinci.xyz/api'
ICFPC_USER_EMAIL = os.environ.get('ICFPC_USER_EMAIL')
ICFPC_USER_PASSWORD = os.environ.get('ICFPC_USER_PASSWORD')

@dataclass
class Client:
    email:str = None
    token:str = None
    expires:datetime = None
    session:requests.Session = None

icfpc_client = Client()

def login(email, password):
    response = requests.post(API_ROOT+'/users/login', json={ "email": email, "password": password })
    response.raise_for_status()
    return response.json()

def ensure_auth():
    if icfpc_client.email == ICFPC_USER_EMAIL and icfpc_client.token and icfpc_client.expires and icfpc_client.expires < datetime.now(tz=timezone.utc):
        return
    creds = login(ICFPC_USER_EMAIL, ICFPC_USER_PASSWORD)
    icfpc_client.email = ICFPC_USER_EMAIL
    icfpc_client.token = creds['token']
    icfpc_client.expires = dateparse(creds['expire'])
    icfpc_client.session = requests.Session()
    icfpc_client.session.headers.update({'Authorization': f'Bearer {icfpc_client.token}'})

def submit(problem: str, solution: str):
    ensure_auth()
    files = {
        'file': (f'solution_{problem}.isl', solution, 'text/plain'),
    }
    response = icfpc_client.session.post(API_ROOT+f'/submissions/{problem}/create', files=files)
    if response.status_code >= 300:
        print(response.text)
        response.raise_for_status()
    return response.json()

def get_results_scoreboard():
    ensure_auth()
    response = icfpc_client.session.get(API_ROOT+'/results/scoreboard')
    response.raise_for_status()
    return response.json()

def get_results_user():
    '''
    User scores: problems, best scores
    '''
    ensure_auth()
    response = icfpc_client.session.get(API_ROOT+'/results/user')
    response.raise_for_status()
    return response.json()

@cached(ttl=60)
def get_cached_results_user():
    return get_results_user()

def get_submissions():
    '''
    All submissions
    '''
    ensure_auth()
    response = icfpc_client.session.get(API_ROOT+'/submissions')
    response.raise_for_status()
    return response.json()

@cached(ttl=60)
def get_cached_submissions():
    return get_submissions()

def proxy_get_endpoint(path):
    ensure_auth()
    response = icfpc_client.session.get(API_ROOT+'/'+path)
    response.raise_for_status()
    return response.json()

def check_auth():
    ensure_auth()
    return { 'user': icfpc_client.email, 'expires': icfpc_client.expires.isoformat() }


def get_submission(id):
    ensure_auth()
    response = icfpc_client.session.get(API_ROOT+f'/submissions/{id}')
    response.raise_for_status()
    return response.json()


def download_best_submissions():
    ensure_auth()

    ts = int(time())
    folder = os.path.dirname(__file__)+f'/../../best_solutions/{ts}'
    os.mkdir(folder)

    res = get_submissions()
    # print(res)

    all_problems = defaultdict(list)
    for submit_info in res['submissions']:
        problem_id = submit_info['problem_id']
        if 'score' not in submit_info:
            continue
        score = submit_info['score']
        id = submit_info['id']
        all_problems[problem_id].append((score, id))

    # print (all_problems)
    
    for problem_id, scores in all_problems.items():
        (score, id) = min(scores)
        detailed_info = get_submission(id)
        # print (problem_id, score, id, detailed_info)
        url = detailed_info['file_url']
        code_response = requests.get(url)
        content = code_response.content.decode()
        print (f'Downloading {id} as {problem_id}_{score}.txt')
        with open(f"{folder}/{problem_id}_{score}.txt", "wt") as f:
            f.write(content)
    
