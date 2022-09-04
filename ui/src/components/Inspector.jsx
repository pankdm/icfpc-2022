import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate, useParams } from "react-router-dom";
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
  getGeometricMedian,
} from "../api";
import { getAppState, setAppState, useAppState } from "../app-state";
import Spacer from "./Spacer";
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
  parseBlockIdsFromCommand,
} from "../utils/utils";
import { Select, TextArea } from "./Inputs";
import { forwardRef } from "react";
import { HintBlocks } from "./PreviewBlocks";
import { Crosshair } from "./Crosshair";

import {
  problemPicture,

  solutionResult,
  solutionError,
  solutionPirctureDiffCost,

  previewLOC,
  previewBlockIds,
  hoveredBlockId,
  hoveredBlock,
  clickedBlock,
  clickedBlockMedianColor,
  selectedPixel,

  activeCmd,
  activeCmdArgs,
} from "../stores";
import * as codegen from '../utils/codegen'

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
export const isRunningSolver = atom();

window.solutionResult = solutionResult;
window.problemPicture = problemPicture;
window.solutionPicture = solutionPicture;
window.getProblemPixel = getProblemPixel;
window.getSolutionPixel = getSolutionPixel;

function Header() {
  const { data } = useQuery(["problems"], getProblems);
  const { problemId } = useParams()
  const [hoverBlocksBothSides, setHoverBlocksBothSides] = useAppState('config.hoverBlocksOnBothSides')
  useEffect(() => {
    setAppState('currentProblemId', problemId)
  }, [problemId])
  const navigate = useNavigate()
  const setProblemId = (id) => {
    navigate(`/problems/${id}`)
  }
  return (
    <Row
      gutter={2}
      className={tw`min-h-[4rem] py-2 px-4 bg-blue-500 text-white justify-center`}
    >
      <Spacer flex={1}/>
      <p className={tw`font-bold text-xl`}>ICFPC 2022</p>
      <Spacer size={2} />
      <p className={tw`font-bold text-xl`}>Problem:</p>
      <Select
        value={problemId || "__none"}
        onChangeValue={setProblemId}
        className={tw`w-48`}
      >
        {!problemId && <option value="__none">&lt;Pick one&gt;</option>}
        {data?.problems?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
      <Spacer flex={0.5}/>
      <p className={tw`text-lg font-bold`}>Hover on both sides:</p>
      <Button className={tw`w-24`} onClick={() => setHoverBlocksBothSides(!hoverBlocksBothSides)}>{hoverBlocksBothSides ? 'Enabled' : 'Disabled'}</Button>
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
        const cls = tw(apply`min-w-full min-h-[1.25rem] h-[1.25rem] px-1 -mx-1 cursor-pointer rounded`, selected ? `bg-[rgba(255,120,120,0.75)]` : `hover:bg-[rgba(255,255,255,0.75)]`)
        const hoverLOC = () => {
          previewLOC.set(idx);
          let blockIds = parseBlockIdsFromCommand(line);
          previewBlockIds.set(blockIds);
        }
        const onClick = () => {
          if (selected) {
            setSelectedLOC(null)
            previewBlockIds.set([]);
          } else {
            setSelectedLOC(idx)
            let blockIds = parseBlockIdsFromCommand(line);
            previewBlockIds.set(blockIds);
          }
        }
        return <div key={idx} onClick={onClick} onMouseEnter={hoverLOC} className={cls}>{line}</div>
    })}
    </Col>
  )
})

function FlameGraph({ className, items, maxSize }) {
  const labelsCls = tw(apply`block whitespace-pre-wrap leading-tight`, className);
  const labelCls = tw(apply`h-[1.25rem]`);
  let cumulative = items.reduce((acc, v) => acc+v, 0);
  const maxItems = maxSize ? Math.max(maxSize, items.length) : items.length
  const labels = _.times(maxItems, idx => {
    const lineLabel = `${idx + 1}:`.padEnd(3)
    const actionCostLabel = items[idx] && ('+'+items[idx]).padEnd(4)
    const sumLabel = cumulative[idx] && '= '+cumulative[idx]
    const str = _.filter([lineLabel, actionCostLabel, sumLabel], v => v).join(' ')
    return str
  })

  return (
    <pre className={labelsCls}>
      {labels.map((label, idx) => (
        <div key={idx} className={labelCls}>{label}</div>
      ))}
    </pre>
  );
}

function SideBar({ className }) {
  const textAreaRef = useRef();
  const { data } = useQuery(["solutions"], getSolutions);
  const [viewMode] = useAppState("viewMode")
  const { problemId } = useParams()
  const [solutionId, setSolutionId] = useAppState("currentSolutionId");
  const [code, setCode] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const error = _solutionResult?.error;
  const errorLine = _solutionResult?.errorLine;
  const actionsCost = _solutionResult?.actionsCost;
  const [editMode, setEditMode] = useAppState("codeEditMode") || false
  const removeLastLine = () => {
    if (!code || editMode) {
      return
    }
    const newCode = code.split('\n').slice(0, -1).join('\n')
    console.log({code, newCode})
    setCode(newCode)
  }
  useHotkeys('Shift+D', removeLastLine, [code])
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
            ?.filter((s) => (problemId ? s.includes(`/${problemId}.txt`) : s))
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
              maxSize={code.split('\n').length}
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
  const [hoverBlocks] = useAppState('config.hoverBlocksOnBothSides')
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

  const _activeCmd = useStore(activeCmd);
  const _selectedPixel = useStore(selectedPixel)

  const getPixel = (event) => {
    const canvasBoundingRect = canvasRef.current.getBoundingClientRect();
    const ctx = problemPicture.get().ctx;
    const x = event.clientX - canvasBoundingRect.x;
    const y = event.clientY - canvasBoundingRect.y;
    const yFlip = canvasBoundingRect.height - (event.clientY - canvasBoundingRect.y);
    const pixel = {
      x: Math.floor(x),
      y: Math.floor(yFlip),
      rgba: getCtxPixel(ctx, x, y).data
    };
    return pixel
  }

  const onClickPixel = (event) => {
    const pixel = getPixel(event)
    selectedPixel.set(pixel);
    if (_activeCmd) {
      const { x, y } = pixel
      pushCmdArg({ point: { x, y }, block: hoveredBlock.get()?.name});
    }
  }

  const [dragging, setDragging] = useState(false)
  const onMouseDown = (event) => {
    setDragging(true)
    const pixel = getPixel(event)
    selectedPixel.set(pixel);
  }
  const onMouseMove = (event) => {
    if (!dragging) return
    const pixel = getPixel(event)
    selectedPixel.set(pixel);
  }
  const onMouseUp = () => {
    setDragging(false)
  }
  return (
    <div
      onClick={onClickPixel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <canvas
        id="picture-canvas"
        ref={canvasRef}
        width={width}
        height={height}
        {...props}
      />
      {_selectedPixel && <Crosshair width={400} height={400} x={_selectedPixel.x} y={_selectedPixel.y} />}
      <HintBlocksView showPreviewBlocks={false} disablePointerEvents={!hoverBlocks} showLabels={false} highlightedBlockBg='transparent' />
    </div>
  );
}

function ProblemView() {
  const { problemId } = useParams()

  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Problem {problemId}</h1>
      <div className={tw`relative border`}>
        {problemId
          ? <TargetPictureCanvas
              problemId={problemId}
              width={400}
              height={400}
            />
          : <div className={tw`flex items-center justify-center w-[400px] h-[400px]`}>
              Picture will show here
            </div>
        }
      </div>
    </div>
  );
}

function SolutionCanvas({ solution, width, height, ...props }) {
  const { problemId } = useParams()
  const { data } = useQuery(["problemInitialState" + problemId], () => getProblemInitialState(problemId));
  const canvasRef = useRef();
  const canvasShadowRef = useRef();
  const justCode = solution
    .split("\n")
    .map((s) => s.split("#", 1).toString().trim())
    .join("\n");

  const computeCodeAndDraw = (initialState, code, width, height) => {
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
    computeCodeAndDraw(data, justCode, width, height);
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

function HintBlocksView({ className, onClickBlock, showLabels=true, showPreviewBlocks=true, highlightedBlockBg, disablePointerEvents=false }) {
  const _solutionResult = useStore(solutionResult);
  const blocks = _solutionResult?.blocks

  const _hoveredBlock = useStore(hoveredBlock);
  const _previewBlockIds = useStore(previewBlockIds);
  const highlightedBlocks = useMemo(() => {
    const highlights = {}
    if (showPreviewBlocks) {
      _previewBlockIds?.forEach(previewId => {
        highlights[previewId] = 'blue'
      })
    }
    if (_hoveredBlock) {
      highlights[_hoveredBlock.name] = 'red'
    }
    return highlights
  }, [_hoveredBlock, _previewBlockIds])
  const onMouseLeaveBlock = () => {
    hoveredBlockId.set();
    hoveredBlock.set();
  };
  const onMouseEnterBlock = (blockId, ev) => {
    hoveredBlockId.set(blockId);
    hoveredBlock.set(blocks && blocks[blockId]);
  }

  return blocks && (
    <HintBlocks
      className={className}
      blocks={blocks}
      highlightedBlocks={highlightedBlocks}
      highlightedBlockBg={highlightedBlockBg}
      showLabels={showLabels}
      disablePointerEvents={disablePointerEvents}
      onClickBlock={onClickBlock}
      onMouseOverBlock={onMouseEnterBlock}
      onMouseLeaveBlock={onMouseLeaveBlock}
    />
  )
}

function SolutionView() {
  const [code] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const _previewLOC = useStore(previewLOC);
  const _activeCmd = useStore(activeCmd);
  let filteredCode = code
  if (_previewLOC && code) {
    filteredCode = code.split('\n').slice(0, _previewLOC + 1).join('\n')
  }
  const onClickBlock = (blockId, ev) => {
    const block = _solutionResult?.blocks[blockId]
    clickedBlock.set(block);
    if (_activeCmd) {
      pushCmdArg({block: hoveredBlock.get().name});
    }
  };
  const body = filteredCode && (
    <>
      <div className={tw`relative border`}>
        <SolutionCanvas solution={filteredCode} width={400} height={400} />
        <HintBlocksView onClickBlock={onClickBlock} />
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
  const { problemId } = useParams()
  const _isRunningSolver = useStore(isRunningSolver);

  const _clickedBlock = useStore(clickedBlock);

  const { data:geometricMedianData } = useQuery([`geometricMedian${problemId}${_clickedBlock?.begin.x}${_clickedBlock?.begin.y}${_clickedBlock?.end.x}${_clickedBlock?.end.y}`],
  async () => {
    if (problemId && _clickedBlock) {
      return await getGeometricMedian(problemId, _clickedBlock.begin.x, _clickedBlock.end.x, _clickedBlock.begin.y, _clickedBlock.end.y);
    } else {
      return undefined;
    }
  });

  if (problemId && _clickedBlock) {
    clickedBlockMedianColor.set(geometricMedianData);
  } else {
    clickedBlockMedianColor.set();
  }

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
        <div className={tw`min-w-[28rem] pl-[6rem] h-[16rem] items-start`}>
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
            <p> geometric median color: [{geometricMedianData?.color.join(", ")}]</p>
            </>
          )}
          {_isRunningSolver && (
            <h1 className={tw`text-4xl font-bold mb-4`}>Running the solver, please wait!</h1>
          )}
        </div>
      </Col>
      <Spacer flex />
    </Row>
  );
}




export async function pushCmdArg({ block, point }) {
  const code = getAppState('currentCode')
  const setCode = (code) => setAppState('currentCode', code)
  const problemId = getAppState('currentProblemId')
  const cmdContext = {
    solutionResult: solutionResult.get(),
    problemId: problemId,
    code: code,
  }

  const cmd = activeCmd.get();
  if (!cmd) {
    return;
  }
  const expectedArgType = cmd.argTypes[_.size(activeCmdArgs.get())]
  const arg = { block, point }[expectedArgType]
  if (!arg) {
    return
  }

  activeCmdArgs.set([...activeCmdArgs.get(), arg]);
  const args = activeCmdArgs.get();
  if (args.length >= cmd.numArgs) {
    const newCode = await cmd.codeGenerator(cmdContext, ...args);
    if (newCode) {
      setCode(code + "\n" + newCode);
    }
    activeCmd.set();
    activeCmdArgs.set();
  }
}


const CMDs = {
  rect: {
    name: "rect (clickTwoPoints)",
    codeGenerator: codegen.generateRectCmds,
    numArgs: 2,
    argTypes: ['point', 'point'],
  },
  cutX: {
    name: "cutX (click on a block, and then point to split)",
    codeGenerator: codegen.generateSplitXCmds,
    numArgs: 2,
    argTypes: ['block', 'point'],
  },
  cutY: {
    name: "cutY (click on a block, and then point to split)",
    codeGenerator: codegen.generateSplitYCmds,
    numArgs: 2,
    argTypes: ['block', 'point'],
  },
  cutXY: {
    name: "cutXY (click on a block, and then point to split)",
    codeGenerator: codegen.generateSplitXYCmds,
    numArgs: 2,
    argTypes: ['block', 'point'],
  },
  swap: {
    name: "swap (click two blocks)",
    codeGenerator: codegen.generateSwapCmds,
    numArgs: 2,
    argTypes: ['block', 'block'],
  },
  colorToMed: {
    name: "color (click block to color to median)",
    codeGenerator: codegen.generateColorToMedCmds,
    numArgs: 1,
    argTypes: ['block'],
  },
  mergeRange: {
    name: "merge range (click left/bottom block first, then the last one)",
    codeGenerator: codegen.generateMergeUpCmds,
    numArgs: 2,
    argTypes: ['block', 'block'],
  },
  binarySolver: {
    name: "run solver (click block)",
    codeGenerator: codegen.generateBinarySolverCmds,
    numArgs: 1,
    argTypes: ['block'],
  },
}

function Footer() {
  const [viewMode, setViewMode] = useAppState("viewMode");
  const _activeCmd = useStore(activeCmd);
  const _activeCmdArgs = useStore(activeCmdArgs);
  const resetCmdStack = () => {
    activeCmd.set();
    activeCmdArgs.set();
  }
  const activateCmd = (cmd) => {
    activeCmd.set(cmd)
    activeCmdArgs.set();
  }
  useHotkeys('Esc', () => resetCmdStack())
  useHotkeys('R', () => activateCmd(CMDs.rect))
  useHotkeys('X', () => activateCmd(CMDs.cutX))
  useHotkeys('V', () => activateCmd(CMDs.cutX))
  useHotkeys('Y', () => activateCmd(CMDs.cutY))
  useHotkeys('H', () => activateCmd(CMDs.cutY))
  useHotkeys('P', () => activateCmd(CMDs.cutXY))
  useHotkeys('M', () => activateCmd(CMDs.mergeRange))
  useHotkeys('Enter', () => activateCmd(CMDs.binarySolver))
  return (
    <Row className={tw`h-24 bg-gray-200 px-4`}>
      {(activeCmd.get() || activeCmdArgs.get()) &&
        <Button color='red' onClick={resetCmdStack}>Esc</Button>
      }
      <Spacer size={2}/>
      <h2 className={tw`text-xl font-bold mb-1 flex-shrink-1`}>{_activeCmd?.name} {_activeCmdArgs?.map(arg => JSON.stringify(arg)).join(", ")}</h2>
      <Spacer flex={1}/>
      <Row gutter={2} className={tw`flex-shrink-0`}>
        <Button color='blue' onClick={() => activateCmd(CMDs.rect)}>(R)ect</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.cutX)}>Cut (X)</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.cutY)}>Cut (Y)</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.cutXY)}>Cut XY (P)</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.swap)}>(S)wap</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.colorToMed)}>Color to Med</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.mergeRange)}>(M)erge Range</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.binarySolver)}>(B)inary Solver</Button>
        <Button color='gray' onClick={() => setViewMode(viewMode == 'wide' ? null : 'wide')}>{viewMode == 'wide' ? 'Wi-i-i-i-de view' : 'Standard view'}</Button>
      </Row>
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
