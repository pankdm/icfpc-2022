import React, { useEffect, useMemo, useRef, useState } from "react";
import _ from "lodash";
import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";
import { atom } from "nanostores";
import { apply, tw } from "twind";
import { css } from "twind/css";
import {
  getProblemImgUrl,
  getProblems,
  getProblemInitialState,
  getSolution,
  getSolutions,
} from "../api";
import { useAppState } from "../app-state";
import Spacer, { Interspaced } from "./Spacer";
import Button from "./Button";
import { Col, Row } from "./Flex";
import {
  computeBlocksAndDraw,
  getCtxFullImageData,
  getCtxPixels,
  getPictureDifferenceCost,
  getBlockDifferenceCost,
  useRaf,
  getCtxPixel,
} from "../utils";
import { Select, TextArea } from "./Inputs";
import { forwardRef } from "react";

const problemPicture = atom();
function getProblemPixels(width, height) {
  const ctx = problemPicture.get()?.ctx;
  return getCtxPixels(ctx, width, height);
}
function getProblemPixel(x, y) {
  const ctx = problemPicture.get()?.ctx;
  return getCtxPixel(ctx, x, y);
}

const solutionPicture = atom();
function getSolutionPixels(width, height) {
  const ctx = solutionPicture.get()?.ctx;
  return getCtxPixels(ctx, width, height);
}
function getSolutionPixel(x, y) {
  const ctx = solutionPicture.get()?.ctx;
  return getCtxPixel(ctx, x, y);
}
const solutionResult = atom();
const solutionError = atom();
const solutionPirctureDiffCost = atom();
const hoveredBlockId = atom();
const hoveredBlock = atom();
const clickedBlock = atom();
const previewLOC = atom();
const selectedPixel = atom();

window.solutionResult = solutionResult;
window.problemPicture = problemPicture;
window.solutionPicture = solutionPicture;
window.getProblemPixel = getProblemPixel;
window.getSolutionPixel = getSolutionPixel;

function Header() {
  const { data } = useQuery(["problems"], getProblems);
  const [problemId, setProblemId] = useAppState("currentProblemId");
  return (
    <Row
      gutter={2}
      className={tw`min-h-[4rem] py-2 px-4 bg-blue-500 text-white justify-center`}
    >
      <p className={tw`font-bold text-xl`}>ICFPC 2022</p>
      <Spacer size={2} />
      <p className={tw`font-bold text-xl`}>Problem:</p>
      <Select
        value={problemId || "__none"}
        onChangeValue={setProblemId}
        className={tw`w-48`}
      >
        {!problemId && <option value="__none">&lt;Pick one&gt;</option>}
        {data?.problems.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    </Row>
  );
}

const InstructionLog = forwardRef(({ code, className }, ref) => {
  const [selectedLOC, setSelectedLOC] = useState()
  if (!code) return <div>Nothing to display</div>
  const instructions = code.split('\n')
  const unpreviewLOC = () => {
    previewLOC.set(selectedLOC || null)
  }
  return (
    <Col ref={ref} onMouseLeave={unpreviewLOC} className={tw(`flex-1 font-mono items-start overflow-auto whitespace-nowrap`, css({flexBasis: 0}), className)}>
      {instructions.map((line, idx) => {
        const selected = selectedLOC == idx
        const cls = tw(apply`w-full px-1 -mx-1 cursor-pointer rounded`, selected ? `bg-[rgba(255,120,120,0.75)]` : `hover:bg-[rgba(255,255,255,0.75)]`)
        const hoverLOC = () => {
          previewLOC.set(idx)
        }
        const onClick = () => {
          if (selected) {
            setSelectedLOC(null)
          } else {
            setSelectedLOC(idx)
          }
        }
        return <div key={idx} onClick={onClick} onMouseEnter={hoverLOC} className={cls}>{line}</div>
    })}
    </Col>
  )
})

function FlameGraph({ className, items }) {
  const labelsCls = tw(apply`whitespace-pre-wrap leading-tight`, className);
  let cumulative = [];
  let sum = 0;
  items.forEach((i) => cumulative.push((sum += i)));
  return (
    <pre className={labelsCls}>
      {cumulative?.map(
        (v, idx) =>
          `${idx + 1}:`.padEnd(3) + ` +${`${items[idx]}`.padEnd(4)} = ${v}\n`
      )}
    </pre>
  );
}

function SideBar({ className }) {
  const textAreaRef = useRef();
  const { data } = useQuery(["solutions"], getSolutions);
  const [viewMode] = useAppState("viewMode")
  const [problemId] = useAppState("currentProblemId");
  const [solutionId, setSolutionId] = useAppState("currentSolutionId");
  const [code, setCode] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const error = _solutionResult?.error;
  const errorLine = _solutionResult?.errorLine;
  const actionsCost = _solutionResult?.actionsCost;
  const [editMode, setEditMode] = useAppState("codeEditMode") || false
  const onToggleEditMode = () => setEditMode(!editMode)
  const onSelectSolution = async (_solutionId) => {
    setSolutionId(_solutionId);
    if (_solutionId == "__new") {
      setCode("# Let's go!!!\ncolor [0] [255, 255, 255, 255]");
    } else {
      const code = await getSolution(_solutionId);
      setCode(code);
    }
  };
  const reloadSolution = async () => await onSelectSolution(solutionId)
  const onChangeCode = async (code) => {
    setCode(code);
  };
  const [scroll, setScroll] = useState(0);
  useRaf(() => {
    if (!textAreaRef.current) return;
    setScroll(textAreaRef.current.scrollTop);
  }, [textAreaRef.current]);
  return (
    <Col
      className={tw(
        `relative w-[30rem] bg-gray-100 p-2 items-stretch transition-all`,
        css({flexBasis: viewMode == 'wide' ? '48rem' : '30rem'}),
        className
      )}
    >
      <Row gutter={1}>
        <h2 className={tw`text-2xl font-bold`}>Solution</h2>
        <Select
          value={solutionId || "__none"}
          onChangeValue={onSelectSolution}
          className={tw`flex-1`}
        >
          {!solutionId && <option value="__none">&lt;Pick one&gt;</option>}
          {data?.solutions
            .filter((s) => (problemId ? s.includes(`/${problemId}.txt`) : s))
            .map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          {problemId && <option value="__new">Manual</option>}
        </Select>
        <Button color='white' className={tw`w-10 h-10 text-3xl p-0 hover:bg-gray-300 active:bg-gray-400`} onClick={reloadSolution}>♻️</Button>
        <Button color={editMode ? 'red' : 'blue'} className={tw`w-24`} onClick={onToggleEditMode}>{editMode ? 'Done' : 'Edit'}</Button>
      </Row>
      <Spacer size={1} />
      <Col className={tw`flex-1`}>
        <Col className={tw`relative flex-1 w-full items-stretch`}>
          {actionsCost && (
            <FlameGraph
              className={tw(
                apply`absolute top-0 pointer-events-none right-[-13.25rem] w-[16rem] py-3 px-4 text-red-700`,
                `translate-y-[-${scroll}px]`
              )}
              items={actionsCost}
            />
          )}
          {editMode
            ? <TextArea
                ref={textAreaRef}
                value={code}
                onChangeValue={onChangeCode}
                className={tw(
                  apply`flex-1 bg-white font-mono whitespace-pre border-0 resize-none py-3 px-4 pr-8`,
                  error && "bg-red-300 focus:bg-red-200 active:bg-red-200"
                )}
              />
            : <InstructionLog
                ref={textAreaRef}
                className={tw(`bg-gray-200 py-3 px-4 leading-tight`, css({flexBasis:0}))}
                code={code}
              />
          }
        </Col>
      </Col>
      {error && (
        <pre
          className={tw`absolute top-[calc(100%+.5rem)] l-1 w-[70rem] left-2 text-red-700 whitespace-pre-wrap`}
        >
          Error on line {errorLine + 1}
          {"\n"}
          {error.toString()}
        </pre>
      )}
    </Col>
  );
}

function TargetPictureCanvas({ problemId, width, height, ...props }) {
  const canvasRef = useRef();
  const _hoveredBlock = useStore(hoveredBlock);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if (!problemId) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      problemPicture.set();
      return;
    }
    const img = new Image();
    img.src = getProblemImgUrl(problemId);
    img.crossOrigin = "anonymous";
    img.addEventListener("load", async () => {
      ctx.drawImage(img, 0, 0);

      if (_hoveredBlock) {
        ctx.beginPath();
        ctx.lineWidth = "2";
        ctx.strokeStyle = "red";
        ctx.rect(_hoveredBlock.begin.x,
          height - _hoveredBlock.end.y,
          _hoveredBlock.end.x - _hoveredBlock.begin.x,
          _hoveredBlock.end.y - _hoveredBlock.begin.y);
        ctx.stroke();
      }


      img.style.display = "none";
      const picturePixelData = getCtxFullImageData(ctx, width, height);
      problemPicture.set({ img: img, ctx: ctx, pixelData: picturePixelData });
      const solutionPixelData = solutionPicture.get()?.pixelData;
      if (solutionPixelData) {
        solutionPirctureDiffCost.set(
          getPictureDifferenceCost(
            solutionPixelData,
            picturePixelData,
            400,
            400
          )
        );
      }
    });
  }, [problemId, _hoveredBlock]);
  return (
    <canvas
      id="picture-canvas"
      ref={canvasRef}
      width={width}
      height={height}
      onClick={(event)=> {
        const canvasBoundingRect = event.target.getBoundingClientRect();
        const ctx = problemPicture.get().ctx;
        const x = event.clientX - canvasBoundingRect.x;
        const y = event.clientY - canvasBoundingRect.y;
        const yFlip = canvasBoundingRect.height - (event.clientY - canvasBoundingRect.y);
        selectedPixel.set({
          x: Math.floor(x),
          y: Math.floor(yFlip),
          rgba: getCtxPixel(ctx, x, y).data
        });
      }}
      {...props}
    />
  );
}

function ProblemView() {
  const [problemId] = useAppState("currentProblemId");
  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Problem {problemId}</h1>
      {problemId ? (
        <TargetPictureCanvas
          problemId={problemId}
          width={400}
          height={400}
          className={tw`border`}
        />
      ) : (
        <div
          className={tw`border flex items-center justify-center w-[400px] h-[400px]`}
        >
          Picture will show here
        </div>
      )}
    </div>
  );
}

function computeCode(initialState, code, width, height) {
  const { ctx, shadowCtx } = solutionPicture.get()
  const result = computeBlocksAndDraw(initialState, code, ctx, shadowCtx);
  solutionResult.set(result);
  solutionError.set(
    result.error ? { error: result.error, line: result.errorLine } : null
  );
  const solutionPixelData = getCtxFullImageData(ctx, width, height);
  solutionPicture.set({
    ...solutionPicture.get(),
    pixelData: solutionPixelData,
  });
  const picturePixelData = problemPicture.get()?.pixelData;
  if (picturePixelData) {
    solutionPirctureDiffCost.set(
      getPictureDifferenceCost(solutionPixelData, picturePixelData, 400, 400)
    );
  }
}

function SolutionCanvas({ solution, width, height, ...props }) {
  const [problemId] = useAppState("currentProblemId");
  const { data } = useQuery(["problemInitialState" + problemId], () => getProblemInitialState(problemId));
  const canvasRef = useRef();
  const canvasShadowRef = useRef();
  const justCode = solution
    .split("\n")
    .map((s) => s.split("#", 1).toString().trim())
    .join("\n");
  useEffect(() => {
    if (!data || !justCode || !canvasRef.current || !canvasShadowRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const shadowCtx = canvasShadowRef.current.getContext("2d");
    if (!ctx || !shadowCtx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    shadowCtx.fillStyle = "white";
    shadowCtx.fillRect(0, 0, width, height);
    solutionPicture.set({
      ctx: ctx,
      shadowCtx: shadowCtx,
    });
    computeCode(data, justCode, width, height);
  }, [justCode, data, problemId]);
  return (
    <>
      <canvas
        id="solution-canvas"
        ref={canvasRef}
        width={width}
        height={height}
        {...props}
      />
      <canvas
        id="solution-canvas-shadow"
        ref={canvasShadowRef}
        width={width}
        height={height}
        className={tw`hidden`}
      />
    </>
  );
}

function BlockDiv({ block }) {
  const _hoveredBlockId = useStore(hoveredBlockId);

  const onBlockMouseLeave = () => {
    hoveredBlockId.set();
    hoveredBlock.set();
  };
  const onBlockMouseEnter = () => {
    hoveredBlockId.set(block.name);
    hoveredBlock.set(block);
  }
  const onClick = () => clickedBlock.set(block);
  const size = block.getSize();
  const borderWidth = 2;
  const blockCls = tw(
    apply`absolute w-[${size.x}px] h-[${size.y}px] left-[${
      block.begin.x - borderWidth
    }px] bottom-[${
      block.begin.y - borderWidth
    }px] bg-transparent border-${borderWidth} box-content border-transparent`,
    block.name == _hoveredBlockId &&
      `bg-[rgba(255,255,255,0.35)] border-red-500`
  );
  const labelCls = tw(
    apply`absolute bottom-full text-red-500 font-bold hidden z-10`,
    block.name == _hoveredBlockId && `inline`
  );
  return (
    <div
      className={blockCls}
      onPointerEnter={onBlockMouseEnter}
      onPointerLeave={onBlockMouseLeave}
      onClick={onClick}
    >
      <span className={labelCls}>{block.name}</span>
    </div>
  );
}

function SolutionView() {
  const [code] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const _previewLOC = useStore(previewLOC);
  const blocks = _solutionResult?.blocks;
  let filteredCode = code
  if (_previewLOC && code) {
    filteredCode = code.split('\n').slice(0, _previewLOC + 1).join('\n')
  }
  const body = filteredCode && (
    <>
      <div className={tw`relative border`}>
        <SolutionCanvas solution={filteredCode} width={400} height={400} />
        {_.map(blocks, (b) => (
          <BlockDiv key={b.name} block={b} />
        ))}
      </div>
    </>
  );
  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Solution</h1>
      {filteredCode ? (
        body
      ) : (
        <div
          className={tw`border flex items-center justify-center w-[400px] h-[400px]`}
        >
          Picture will show here
        </div>
      )}
    </div>
  );
}

function Face2FaceView() {
  const differenceCost = useStore(solutionPirctureDiffCost);
  const _solutionResult = useStore(solutionResult);
  const actionsCots = _solutionResult?.actionsCost;
  const totalActionsCost = _.sum(actionsCots);
  const _selectedPixel = useStore(selectedPixel);

  const _clickedBlock = useStore(clickedBlock);
  const blockDifferenceCost = useMemo(() => {
    const picturePixelData = problemPicture.get()?.pixelData;
    const solutionPixelData = solutionPicture.get()?.pixelData;
    if (picturePixelData && solutionPixelData) {
      return getBlockDifferenceCost(
        picturePixelData,
        solutionPixelData,
        _clickedBlock
      );
    }
  }, [_clickedBlock]);
  const blockInfo = _clickedBlock ? (
    <div>
      <p>Block {_clickedBlock.name}</p>
      <p>
        begin: ({_clickedBlock.begin.x}, {_clickedBlock.begin.y}) end: (
        {_clickedBlock.end.x}, {_clickedBlock.end.y})
      </p>
      <p> differenceCost: {blockDifferenceCost}</p>
    </div>
  ) : (
    <div></div>
  );

  return (
    <Row className={tw`flex-1 overflow-auto`}>
      <Spacer flex />
      <Col centeredItems>
        <Row>
          <SolutionView />
          <Spacer size={8} />
          <ProblemView />
        </Row>
        <div className={tw`min-w-[28rem] pl-[6rem] min-h-[12rem] items-start`}>
          <p>Picture diff cost: {differenceCost}</p>
          <p>Total actions cost: {totalActionsCost}</p>
          <p>Grand total: {differenceCost + totalActionsCost}</p>
          <p>Selected XY: [{_selectedPixel?.x}, {_selectedPixel?.y}] </p>
          <p>Selected color: [{_selectedPixel?.rgba.join(", ")}] </p>
          {_clickedBlock && (
            <>
            <p>Block {_clickedBlock.name}</p>
            <p>
              begin: ({_clickedBlock.begin.x}, {_clickedBlock.begin.y}) end: (
              {_clickedBlock.end.x}, {_clickedBlock.end.y})
            </p>
            <p> differenceCost: {blockDifferenceCost}</p>
            </>
          )}
        </div>
      </Col>
      <Spacer flex />
    </Row>
  );
}

function Footer() {
  const [viewMode, setViewMode] = useAppState("viewMode")
  return (
    <Row className={tw`h-24 bg-gray-200 px-4`}>
      <Spacer flex={1}/>
      <Button color='gray' onClick={() => setViewMode(viewMode == 'wide' ? null : 'wide')}>{viewMode == 'wide' ? 'Wi-i-i-i-de view' : 'Standard view'}</Button>
    </Row>
  );
}

export default function Inspector() {
  return (
    <div className={tw`min-w-[900px] min-h-screen flex flex-col overflow-hidden`}>
      <Header />
      <div className={tw`flex-1 flex`}>
        <SideBar className={tw`z-10`} />
        <Face2FaceView />
      </div>
      <Footer />
    </div>
  );
}
