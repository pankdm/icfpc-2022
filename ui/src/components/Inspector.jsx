import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";
import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";
import { atom } from "nanostores";
import { apply, tw } from "twind";
import { css } from "twind/css";
import {
  getProblemImgUrl,
  getProblems,
  getSolution,
  getSolutions,
} from "../api";
import { useAppState } from "../app-state";
import Spacer, { Interspaced } from "./Spacer";
import { Col, Row } from "./Flex";
import {
  computeBlocksAndDraw,
  getCtxFullImageData,
  getCtxPixels,
  getPictureDifferenceCost,
  useRaf,
} from "../utils";
import { Select, TextArea } from "./Inputs";

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
const clickedBlock = atom();

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
  const [problemId] = useAppState("currentProblemId");
  const [solutionId, setSolutionId] = useAppState("currentSolutionId");
  const [code, setCode] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const error = _solutionResult?.error;
  const errorLine = _solutionResult?.errorLine;
  const actionsCost = _solutionResult?.actionsCost;
  const onSelectSolution = async (_solutionId) => {
    setSolutionId(_solutionId);
    if (_solutionId == "__new") {
      setCode("# Let's go!!!\ncolor [0] [255, 255, 255, 255]");
    } else {
      const code = await getSolution(_solutionId);
      setCode(code);
    }
  };
  const onChangeCode = async (code) => {
    setCode(code);
  };
  const [scroll, setScroll] = useState(0);
  useRaf(() => {
    if (!textAreaRef.current) return;
    setScroll(textAreaRef.current?.scrollTop);
  }, [textAreaRef.current]);
  return (
    <Col
      className={tw(
        `relative w-[30rem] bg-gray-100 p-2 items-stretch flex-basis-2`,
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
          <TextArea
            ref={textAreaRef}
            value={code}
            onChangeValue={onChangeCode}
            className={tw(
              apply`flex-1 font-mono whitespace-pre resize-none`,
              error && "bg-red-300 focus:bg-red-200 active:bg-red-200"
            )}
          />
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
  }, [problemId]);
  return (
    <canvas
      id="picture-canvas"
      ref={canvasRef}
      width={width}
      height={height}
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

function SolutionCanvas({ solution, width, height, ...props }) {
  const canvasRef = useRef();
  const canvasShadowRef = useRef();
  const justCode = solution
    .split("\n")
    .map((s) => s.split("#", 1).toString().trim())
    .join("\n");
  useEffect(() => {
    if (!justCode || !canvasRef.current || !canvasShadowRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const shadowCtx = canvasShadowRef.current.getContext("2d");
    if (!ctx || !shadowCtx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    shadowCtx.fillStyle = "white";
    shadowCtx.fillRect(0, 0, width, height);
    const result = computeBlocksAndDraw(justCode, ctx, shadowCtx);
    const solutionPixelData = getCtxFullImageData(ctx, width, height);
    solutionPicture.set({
      ctx: ctx,
      shadowCtx: shadowCtx,
      pixelData: solutionPixelData,
    });
    solutionResult.set(result);
    solutionError.set(
      result.error ? { error: result.error, line: result.errorLine } : null
    );
    const picturePixelData = problemPicture.get()?.pixelData;
    if (picturePixelData) {
      solutionPirctureDiffCost.set(
        getPictureDifferenceCost(solutionPixelData, picturePixelData, 400, 400)
      );
    }
  }, [justCode]);
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

  const onBlockMouseLeave = () => hoveredBlockId.set();
  const onBlockMouseEnter = () => hoveredBlockId.set(block.name);
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
  const blocks = _solutionResult?.blocks;
  const body = code && (
    <>
      <div className={tw`relative border`}>
        <SolutionCanvas solution={code} width={400} height={400} />
        {_.map(blocks, (b) => (
          <BlockDiv key={b.name} block={b} />
        ))}
      </div>
    </>
  );
  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Solution</h1>
      {code ? (
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
  return (
    <Row className={tw`flex-1 overflow-auto`}>
      <Spacer flex />
      <Col centeredItems>
        <Row>
          <SolutionView />
          <Spacer size={8} />
          <ProblemView />
        </Row>
        <div className={tw`min-w-64 items-start`}>
          <p>Picture diff cost: {differenceCost}</p>
          <p>Total actions cost: {totalActionsCost}</p>
          <p>Grand total: {differenceCost + totalActionsCost}</p>
        </div>
      </Col>
      <Spacer flex />
    </Row>
  );
}

function Footer() {
  const _clickedBlock = useStore(clickedBlock);
  const blockInfo = _clickedBlock ? (
    <div>
      <p>block {_clickedBlock.name}</p>
      <p>
        begin: ({_clickedBlock.begin.x}, {_clickedBlock.begin.y}) end: (
        {_clickedBlock.end.x}, {_clickedBlock.end.y})
      </p>
    </div>
  ) : (
    <div></div>
  );

  return <div className={tw`h-24 bg-gray-200`}>{blockInfo}</div>;
}

export default function Inspector() {
  return (
    <div className={tw`min-w-[900px] min-h-screen flex flex-col`}>
      <Header />
      <div className={tw`flex-1 flex`}>
        <SideBar className={tw`z-10`} />
        <Face2FaceView />
      </div>
      <Footer />
    </div>
  );
}
