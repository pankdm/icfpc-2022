import React, { useEffect, useRef } from 'react'
import _ from 'lodash'
import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { atom } from 'nanostores'
import { tw } from 'twind'
import { getProblemImgUrl, getProblems, getSolution, getSolutions } from '../api'
import { useAppState } from '../app-state'
import Spacer, { Interspaced } from './Spacer'
import { Col, Row } from './Flex'
import { computeBlocksAndDraw, getCtxFullImageData, getCtxPixels, getPictureDifferenceCost  } from '../utils'
import { Select, TextArea } from './Inputs'

const problemPicture = atom()
function getProblemPixels(width, height) {
  const ctx = problemPicture.get()?.ctx
  return getCtxPixels(ctx, width, height)
}
function getProblemPixel(x,y) {
  const ctx = problemPicture.get()?.ctx
  return getCtxPixel(ctx, x, y)
}

const solutionPicture = atom()
function getSolutionPixels(width, height) {
  const ctx = solutionPicture.get()?.ctx
  return getCtxPixels(ctx, width, height)
}
function getSolutionPixel(x,y) {
  const ctx = solutionPicture.get()?.ctx
  return getCtxPixel(ctx, x, y)
}
const solutionResult = atom()
const solutionError = atom()
const solutionPirctureDiffCost = atom()

window.solutionResult = solutionResult
window.problemPicture = problemPicture
window.solutionPicture = solutionPicture
window.getProblemPixel = getProblemPixel
window.getSolutionPixel = getSolutionPixel


function Header() {
  const { data } = useQuery(['problems'], getProblems)
  const [problemId, setProblemId] = useAppState('currentProblemId')
  return (
    <Row gutter={2} className={tw`min-h-[4rem] py-2 px-4 bg-blue-500 text-white justify-center`}>
      <p className={tw`font-bold text-xl`}>ICFPC 2022</p>
      <Spacer size={2} />
      <p className={tw`font-bold text-xl`}>Problem:</p>
      <Select value={problemId || '__none'} onChangeValue={setProblemId} className={tw`w-48`}>
        {!problemId && <option value='__none'>&lt;Pick one&gt;</option>}
        {data?.problems.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Select>
    </Row>
  )
}


function SideBar() {
  const { data } = useQuery(['solutions'], getSolutions)
  const [problemId] = useAppState('currentProblemId')
  const [solutionId, setSolutionId] = useAppState('currentSolutionId')
  const [code, setCode] = useAppState('currentCode')
  const onSelectSolution = async (_solutionId) => {
    setSolutionId(_solutionId)
    if (_solutionId == '__new') {
      setCode('# Let\'s go!!!\ncolor [0] [255, 255, 255, 255]')
    } else {
      const code = await getSolution(_solutionId)
      setCode(code)
    }
  }
  const onChangeCode = async (code) => {
    setCode(code)
  }
  return (
    <Col className={tw`w-[30rem] bg-gray-100 p-2 overflow-y-auto items-stretch flex-basis-2`}>
      <Row gutter={1}>
        <h2 className={tw`text-2xl font-bold`}>Solution</h2>
        <Select value={solutionId || '__none'} onChangeValue={onSelectSolution} className={tw`flex-1`}>
          {!solutionId && <option value='__none'>&lt;Pick one&gt;</option>}
          {data?.solutions.filter(s => problemId ? s.includes(`/${problemId}.txt`) : s).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          {problemId && <option value='__new'>Manual</option>}
        </Select>
      </Row>
      <Spacer size={1} />
      <TextArea value={code} onChangeValue={onChangeCode} className={tw`flex-1 font-mono overflow-scroll whitespace-pre resize-none`} />
    </Col>
  )
}


function TargetPictureCanvas({problemId, width, height, ...props}) {
  const canvasRef = useRef()
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    if (!problemId) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, width, height)
      problemPicture.set()
      return
    }
    const img = new Image()
    img.src = getProblemImgUrl(problemId);
    img.crossOrigin = "anonymous";
    img.addEventListener('load', async () => {
      ctx.drawImage(img, 0, 0)
      img.style.display = 'none';
      const picturePixelData = getCtxFullImageData(ctx, width, height)
      problemPicture.set({ img: img, ctx: ctx, pixelData: picturePixelData })
      const solutionPixelData = solutionPicture.get()?.pixelData
      if (solutionPixelData) {
        solutionPirctureDiffCost.set(getPictureDifferenceCost(solutionPixelData, picturePixelData, 400, 400))
      }
    });
  }, [problemId])
  return <canvas id='picture-canvas' ref={canvasRef} width={width} height={height} {...props} />
}

function ProblemView() {
  const [problemId] = useAppState('currentProblemId')
  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Problem {problemId}</h1>
      {problemId
        ? <TargetPictureCanvas problemId={problemId} width={400} height={400} className={tw`border`} />
        : <div className={tw`border flex items-center justify-center w-[400px] h-[400px]`}>Picture will show here</div>
      }
    </div>
  )
}

function SolutionCanvas({ solution, width, height, ...props }) {
  const canvasRef = useRef()
  const canvasShadowRef = useRef()
  const justCode = solution.split('\n').map(s => s.split('#', 1).toString().trim()).join('\n')
  useEffect(() => {
    if (!justCode || !canvasRef.current || !canvasShadowRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const shadowCtx = canvasShadowRef.current.getContext('2d')
    if (!ctx || !shadowCtx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    shadowCtx.fillStyle = 'white'
    shadowCtx.fillRect(0, 0, width, height)
    const result = computeBlocksAndDraw(justCode, ctx, shadowCtx)
    const solutionPixelData = getCtxFullImageData(ctx, width, height)
    solutionPicture.set({ ctx: ctx, shadowCtx: shadowCtx, pixelData: solutionPixelData })
    solutionResult.set(result)
    solutionError.set(result.error ? {error: result.error, line: result.errorLine} : null)
    const picturePixelData = problemPicture.get()?.pixelData
    if (picturePixelData) {
      solutionPirctureDiffCost.set(getPictureDifferenceCost(solutionPixelData, picturePixelData, 400, 400))
    }
  }, [justCode])
  return (
    <>
      <canvas id='solution-canvas' ref={canvasRef} width={width} height={height} {...props} />
      <canvas id='solution-canvas-shadow' ref={canvasShadowRef} width={width} height={height} className={tw`hidden`}/>
    </>
  )
}


function SolutionView() {
  const [code] = useAppState('currentCode')
  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Solution</h1>
      {code
        ? <SolutionCanvas solution={code} width={400} height={400} className={tw`border`} />
        : <div className={tw`border flex items-center justify-center w-[400px] h-[400px]`}>Picture will show here</div>
      }
    </div>
  )
}


function Face2FaceView() {
  const differenceCost = useStore(solutionPirctureDiffCost)
  const _solutionResult = useStore(solutionResult)
  return (
    <Row className={tw`flex-1 overflow-auto`}>
      <Spacer flex />
      <Col centeredItems>
        <Row>
          <SolutionView />
          <Spacer size={8} />
          <ProblemView />
        </Row>
        <p>Picture diff cost: {differenceCost}</p>
        <p>Total actions cost: {_.sum(_solutionResult?.actionsCost)}</p>
      </Col>
      <Spacer flex />
    </Row>
  )
}


function Footer() {
  return (
    <div className={tw`h-24 bg-gray-200`}>
      <h1>Footer</h1>
    </div>
  )
}



export default function Inspector() {
  return (
    <div className={tw`min-w-[900px] min-h-screen flex flex-col`}>
      <Header/>
      <div className={tw`flex-1 flex`}>
        <SideBar/>
        <Face2FaceView/>
      </div>
      <Footer/>
    </div >
  )
}
