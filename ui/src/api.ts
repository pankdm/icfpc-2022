import { useQuery } from "@tanstack/react-query"
import _ from "lodash"
import { useParams } from "react-router-dom"
import { getAppState } from "./app-state"

async function genericApiRequest(SERVER_URL, path, params) {
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

// local API
const SERVER_URL = 'http://localhost:8000'
export function getAPIpath(path) {
  return SERVER_URL + path
}
async function localApiRequest(path, params) {
  return genericApiRequest(SERVER_URL, path, params)
}

export async function ping() {
  return await localApiRequest('/', { method: 'GET' })
}

export async function checkAuth() {
  return await localApiRequest('/check-auth', { method: 'POST' })
}

export async function getProblems() {
  return await localApiRequest(`/problems`, { method: 'GET' })
}

export async function getProblem(problemId): Promise<ArrayBuffer> {
  return await localApiRequest(`/problems/${problemId}`, { method: 'GET' })
}

export async function getProblemInitialState(problemId) {
  return await localApiRequest(`/problem_initial_states/${problemId}`, { method: 'GET' })
}

export async function getGeometricMedian(problemId, x1, x2, y1, y2) {
  return await localApiRequest(`/geometric_median`, {
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
  return await localApiRequest(`/run_solver`, {
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
      initial_color: initialColor,
    })
  });
}

export async function getPixelSolverSolution(problemId, blockId, x1, x2, y1, y2, gravityX, gravityY, maxBlockId, extraArgs) {
  const body = _.pickBy(
    {
      problem_id: problemId,
      block_id: blockId,
      x1: x1,
      x2: x2,
      y1: y1,
      y2: y2,
      gravity_x: gravityX,
      gravity_y: gravityY,
      max_block_id: maxBlockId,
      extra_args: extraArgs,
    },
    v => v !== undefined,
  )
  console.log('POST /run_pixel_solver', body)
  return await localApiRequest(`/run_pixel_solver`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export async function getSolutions() {
  return await localApiRequest(`/solutions`, { method: 'GET' })
}

export async function getSolution(solutionId): Promise<String> {
  return await localApiRequest(`/solutions/${solutionId}`, { method: 'GET' })
}

export async function submitSolution(solutionId: String, code: String) {
  const body = {
    solution: code
  }
  return await localApiRequest(`/solutions/${solutionId}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
}

export async function getBestSolution(solutionId): Promise<String> {
  return await localApiRequest(`/best_solutions/${solutionId}`, { method: 'GET' })
}


export function getProblemImgUrl(problemId) {
  return getAPIpath(`/problems/${problemId}`)
}
export function getProblemStartImgUrl(problemId) {
  return getAPIpath(`/problems_start/${problemId}`)
}

export function getProblemSolutionImgUrl(problemId) {
  return getAPIpath(`/previews/${problemId}`)
}


// ICFPC API
const ICFPC_SERVER_URL = 'http://localhost:8000/icfpc'
export function ICFPCApiPath(path) {
  return SERVER_URL + path
}
async function ICFPCApiRequest(path, params) {
  return genericApiRequest(ICFPC_SERVER_URL, path, params)
}


export async function getScoreboard() {
  return await ICFPCApiRequest(`/results/scoreboard`, { method: 'GET' })
}


const LOCAL = {
  getAPIpath,
  ping,
  checkAuth,
  getProblems,
  getProblem,
  getSolutions,
  getSolution,
}

export const ICFPC = {
  getScoreboard,
}

export default LOCAL

window.API = LOCAL
window.ICFPC = ICFPC


// useData methods
export function useProblemMeta(problemId) {
  const { data } = useQuery(["problems"], getProblems);
  const problemMeta = data?.problems?.[problemId - 1]
  if (!problemMeta) return
  const {
    min_cost: ourBestCost,
    overall_best_cost: overallBestCost
  } = problemMeta
  const bounty = ourBestCost - overallBestCost
  return {
    ...problemMeta,
    ourBestCost,
    overallBestCost,
    bounty,
  }
}
