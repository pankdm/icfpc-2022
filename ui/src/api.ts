const SERVER_URL = 'http://localhost:8000'


export function APIpath(path) {
  return SERVER_URL + path
}

async function api_request(path, params) {
  const result = await fetch(`${SERVER_URL}${path}`, params)
  let body: any
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

export async function getProblemInitialState(problemId) {
  return await api_request(`/problem_initial_states/${problemId}`, { method: 'GET' })
}

export async function getGeometricMedian(problemId, x1, x2, y1, y2) {
  return await api_request(`/geometric_median`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: problemId,
      x1: x1,
      x2: x2,
      y1: y1,
      y2: y2
    })
  });
}

export async function getBinarySolverSolution(problemId, blockId, x1, x2, y1, y2, initialColor) {
  return await api_request(`/run_solver`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      problem_id: problemId,
      block_id: blockId,
      x1: x1,
      x2: x2,
      y1: y1,
      y2: y2,
      initial_color: initialColor
    })
  });
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
