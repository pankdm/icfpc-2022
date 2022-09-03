const SERVER_URL = 'http://localhost:8000'


export function APIpath(path) {
  return SERVER_URL + path
}

async function api_request(path, params) {
  const result = await fetch(`${SERVER_URL}${path}`, params)
  let body:any
  const contentType = result.headers.get('Content-Type') || ''
  if (contentType == 'application/json') {
    body = result.json()
  } else if (contentType.includes('image')) {
    body = result.arrayBuffer()
  } else {
    body = result.text()
  }
  return body
}

export async function ping() {
  return await api_request('/', { method: 'GET' })
}

export async function checkAuth() {
  return await api_request('/check-auth', { method: 'POST' })
}

export async function getProblems() {
  return await api_request(`/problems`, { method: 'GET' })
}

export async function getProblem(problemId): Promise<ArrayBuffer> {
  return await api_request(`/problems/${problemId}`, { method: 'GET' })
}

export async function getSolutions() {
  return await api_request(`/solutions`, { method: 'GET' })
}

export async function getSolution(solutionId): Promise<String> {
  return await api_request(`/solutions/${solutionId}`, { method: 'GET' })
}

export function getProblemImgUrl(problemId) {
  return APIpath(`/problems/${problemId}`)
}

const API = {
  APIpath,
  ping,
  checkAuth,
  getProblems,
  getProblem,
  getSolutions,
  getSolution,
}

export default API

window.API = API
