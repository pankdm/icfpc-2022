import React, { useEffect, useRef } from 'react'
import _ from 'lodash'
import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { atom } from 'nanostores'
import { tw } from 'twind'
import { getProblem, getProblemImgUrl, getProblems, getSolution, getSolutions } from '../api'
import { useAppState } from '../app-state'
import Button from "./Button"
import Select from "./Select"
import Spacer, { Interspaced } from './Spacer'
import { Col, Row } from './Flex'
import TextArea from './TextArea'

const problemPicture = atom()
const problemPicture2DCtx = atom()
function getProblemPixel(x,y) {
  const ctx = problemPicture2DCtx.get()
  if (!ctx) return null
  return ctx.getImageData(x, y, 1, 1).data;
}

window.getProblemPixel = getProblemPixel


function Header() {
  const { data } = useQuery(['problems'], getProblems)
  const [problemId, setProblemId] = useAppState('currentProblemId')
  return (
    <Interspaced gutter={2} className={tw`min-h-[4rem] py-2 px-4 flex items-center bg-blue-500 text-white justify-center`}>
      <p className={tw`font-bold text-xl`}>Problem:</p>
      <Select value={problemId || '__none'} onChangeValue={setProblemId} className={tw`w-48`}>
        {!problemId && <option value='__none'></option>}
        {data?.problems.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Select>
    </Interspaced>
  )
}


function SideBar() {
  const { data } = useQuery(['solutions'], getSolutions)
  const [solution, setSolution] = useAppState('currentSolution')
  const [code, setCode] = useAppState('currentCode')
  const solutionId = solution?.id
  const instructions = solution?.instructions
  const onSelectSolution = async (_solutionId) => {
    const instructions = await getSolution(_solutionId)
    setSolution({ id: _solutionId, instructions })
    setCode(instructions)
  }
  return (
    <Col className={tw`w-96 bg-gray-100 p-2 overflow-y-auto items-stretch`}>
      <Row gutter={1}>
        <h2 className={tw`text-2xl font-bold`}>Solution</h2>
        <Select value={solutionId || '__none'} onChangeValue={onSelectSolution} className={tw`flex-1`}>
          {!solutionId && <option value='__none'></option>}
          {data?.solutions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>
      </Row>
      <Spacer size={1} />
      <TextArea value={code} onChangeValue={setCode} className={tw`flex-1 font-mono overflow-scroll whitespace-pre`} />
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
      console.log('fill')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, width, height)
      problemPicture.set()
      problemPicture2DCtx.set()
      return
    }
    const img = new Image()
    img.src = getProblemImgUrl(problemId);
    img.crossOrigin = "anonymous";
    img.addEventListener('load', async () => {
      problemPicture.set(img)
      ctx.drawImage(img, 0, 0)
      img.style.display = 'none';
      const _ctx = canvasRef.current.getContext('2d')
      problemPicture2DCtx.set(_ctx)
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


function getBlocks(solution) {
  const blocks = []

}


function SolutionCanvas({ problemId, width, height, ...props }) {
  const canvasRef = useRef()
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    if (!problemId) {
      console.log('fill')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, width, height)
      return
    }
  }, [problemId])
  return <canvas id='solution-canvas' ref={canvasRef} width={width} height={height} {...props} />
}


function SolutionView() {
  const [problemId] = useAppState('currentProblemId')
  const [solution, setSolution] = useAppState('currentSolution')
  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Solution</h1>
      {problemId
        ? <SolutionCanvas problemId={problemId} width={400} height={400} className={tw`border`} />
        : <div className={tw`border flex items-center justify-center w-[400px] h-[400px]`}>Picture will show here</div>
      }
    </div>
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
        <Spacer flex/>
        <SolutionView/>
        <Spacer size={8}/>
        <ProblemView/>
        <Spacer flex/>
      </div>
      <Footer/>
    </div >
  )
}
