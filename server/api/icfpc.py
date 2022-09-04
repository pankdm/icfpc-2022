from dataclasses import dataclass
from datetime import datetime, timezone
from dateutil.parser import parse as dateparse
import os
import requests
import requests.auth

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

def proxy_get_endpoint(path):
    ensure_auth()
    response = icfpc_client.session.get(API_ROOT+'/'+path)
    response.raise_for_status()
    return response.json()

def check_auth():
    ensure_auth()
    return { 'user': icfpc_client.email, 'expires': icfpc_client.expires.isoformat() }
