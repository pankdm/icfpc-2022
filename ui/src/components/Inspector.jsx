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
  getGeometricMedian,
  getBinarySolverSolution,
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
  parseBlockIdsFromCommand,
} from "../utils";
import { Select, TextArea } from "./Inputs";
import { forwardRef } from "react";
import { HintBlocks } from "./PreviewBlocks";
import { Crosshair } from "./Crosshair";

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

export const hoveredBlockId = atom();
export const hoveredBlock = atom();
export const previewBlockIds = atom();

const clickedBlock = atom();
const clickedBlockMedianColor = atom();
const previewLOC = atom();
const selectedPixel = atom();
const activeCmd = atom();
const activeCmdArgs = atom();

const isRunningSolver = atom();

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
        {data?.problems?.map((opt) => (
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
  const labelsCls = tw(apply`whitespace-pre-wrap leading-tight`, className);
  let cumulative = items.reduce((acc, v) => acc+v, 0);
  const maxItems = maxSize ? Math.max(maxSize, items.length) : items.length
  const labelsText = _.times(maxItems, idx => {
    const lineLabel = `${idx + 1}:`.padEnd(3)
    const actionCostLabel = items[idx] && ('+'+items[idx]).padEnd(4)
    const sumLabel = cumulative[idx] && '= '+cumulative[idx]
    const str = _.filter([lineLabel, actionCostLabel, sumLabel], v => v).join(' ')
    return str
  }).join('\n')

  return (
    <pre className={labelsCls}>
      {labelsText}
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


  const [code, setCode] = useAppState("currentCode");
  const _activeCmd = useStore(activeCmd);
  const _solutionResult = useStore(solutionResult);

  const onClickPixel = (event) => {
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
    selectedPixel.set(pixel);
    if (_activeCmd) {
      console.log(pixel)
      pushCmdArg({
        code,
        setCode,
        solutionResult: _solutionResult,
        problemId
      }, pixel);
    }
  }
  return (
    <canvas
      id="picture-canvas"
      onClick={onClickPixel}
      ref={canvasRef}
      width={width}
      height={height}
      {...props}
    />
  );
}

function ProblemView() {
  const [problemId] = useAppState("currentProblemId");
  const _selectedPixel = useStore(selectedPixel)
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
        {_selectedPixel && <Crosshair width={400} height={400} x={_selectedPixel.x} y={_selectedPixel.y} />}
        <HintBlocksView disablePointerEvents />
      </div>
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

function HintBlocksView({ className, showPreviewBlocks=true, disablePointerEvents=false }) {
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

  const _activeCmd = useStore(activeCmd);
  const [code, setCode] = useAppState("currentCode");
  const [problemId] = useAppState("currentProblemId");
  const onClick = (blockId, ev) => {
    const block = blocks[blockId]
    clickedBlock.set(block);
    if (_activeCmd) {
      pushCmdArg({
        code,
        setCode,
        solutionResult: _solutionResult,
        problemId
      }, _hoveredBlock.name);
    }
  };

  return blocks && (
    <HintBlocks
      className={className}
      blocks={blocks}
      highlightedBlocks={highlightedBlocks}
      disablePointerEvents={disablePointerEvents}
      onClickBlock={onClick}
      onMouseOverBlock={onMouseEnterBlock}
      onMouseLeaveBlock={onMouseLeaveBlock}
    />
  )
}

function SolutionView() {
  const [code] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const _previewLOC = useStore(previewLOC);
  let filteredCode = code
  if (_previewLOC && code) {
    filteredCode = code.split('\n').slice(0, _previewLOC + 1).join('\n')
  }
  const body = filteredCode && (
    <>
      <div className={tw`relative border`}>
        <SolutionCanvas solution={filteredCode} width={400} height={400} />
        <HintBlocksView />
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
  const [problemId] = useAppState("currentProblemId");
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


function generateLinearMergeCmds(cmdContext, startBlockId, endBlockId, direction) {
  const {solutionResult} = cmdContext;

  if (typeof startBlockId !== 'string') { throw Error(`startBlockId must be a string: ${startBlockId}`); }
  if (typeof endBlockId !== 'string') { throw Error(`startBlockId must be a string: ${startBlockId}`); }

  function findNextUp(thisBlock) {
    for (let otherBlockId in solutionResult.blocks) {
      const otherBlock = solutionResult.blocks[otherBlockId];
      if (otherBlock.begin.y === thisBlock.end.y &&
          otherBlock.begin.x === thisBlock.begin.x &&
          otherBlock.end.x === thisBlock.end.x) {
            return otherBlockId;
          }
    }
  }

  function findNextRight(thisBlock) {
    for (let otherBlockId in solutionResult.blocks) {
      const otherBlock = solutionResult.blocks[otherBlockId];
      if (otherBlock.begin.x === thisBlock.end.x &&
          otherBlock.begin.y === thisBlock.begin.y &&
          otherBlock.end.y === thisBlock.end.y) {
            return otherBlockId;
          }
    }
  }

  let startBlock = solutionResult.blocks[startBlockId];
  let endBlock = solutionResult.blocks[endBlockId];

  console.log('startBlock ', startBlock, 'endBlock ', endBlock);

  let findNext = undefined;
  if (direction === 'up') {
    findNext = findNextUp;
  } else if (direction === "right") {
    findNext = findNextRight;
  } else {
    throw new Error(`Bad direction ${direction}`);
  }

  const cmds = [];
  let currentBlock = startBlock;
  let currentBlockId = startBlockId;
  const maxBlockId = _.max(Object.keys(solutionResult.blocks).map(id => JSON.parse(id.split(".")[0])))
  while (true) {
    const nextId = findNext(currentBlock);
    if (nextId) {
      cmds.push(`merge [${currentBlockId}] [${nextId}]`);
      currentBlockId = `${parseInt(maxBlockId) + cmds.length}`;
      currentBlock = solutionResult.blocks[nextId];

      if (nextId === endBlockId) {
        break;
      }
    } else {
      break;
    }
  }

  return cmds.join("\n");
}

function generateMergeUpCmds(cmdContext, startBlockId, endBlockId) {
  const {solutionResult} = cmdContext;

  const blocks = solutionResult.blocks;

  const startBlock = blocks[startBlockId];
  const endBlock = blocks[endBlockId];

  if (startBlock.begin.x == endBlock.begin.x &&
      startBlock.end.x == endBlock.end.x &&
      endBlock.begin.y >= startBlock.end.y) {
        return generateLinearMergeCmds(cmdContext, startBlockId, endBlockId, "up");
  } else if (startBlock.begin.y == endBlock.begin.y &&
    startBlock.end.y == endBlock.end.y &&
    endBlock.begin.x >= startBlock.end.x) {
      return generateLinearMergeCmds(cmdContext, startBlockId, endBlockId, "right");
  } else if (startBlock.begin.x > endBlock.begin.x ||
    startBlock.begin.y > endBlock.begin.y) {
      window.alert("bad block order");
    }

  // Reconstruct the grid.
  const xStep = startBlock.getSize().x;
  const yStep = startBlock.getSize().y;
  const xSize = (endBlock.end.x - startBlock.begin.x) / xStep;
  const ySize = (endBlock.end.y - startBlock.begin.y) / yStep;
  const grid = new Map();
  for (let xi = 0; xi < xSize; xi++) {
    for (let yi = 0; yi < ySize; yi++) {
      let found = false;
      for (const blockId in blocks) {
        const block  = blocks[blockId];
        if (block.begin.x === startBlock.begin.x + xi * xStep &&
            block.begin.y === startBlock.begin.y + yi * yStep &&
            block.end.x === startBlock.begin.x + (xi + 1) * xStep &&
            block.end.y === startBlock.begin.y + (yi + 1) * yStep) {
              grid.set(`${xi}_${yi}`, block);
              found = true;
              break;
            }
      }
      if (!found) {
        window.alert("not a grid");
        return "";
      }
    }
  }

  const maxBlockId = parseInt(_.max(Object.keys(blocks).map(id => JSON.parse(id.split(".")[0]))));
  const cmds = [];

  // Merge rows first.
  const rowNewBlockIds = [];
  for (let xi = 0; xi < xSize; xi++) {
    let lastBlockId = grid.get(`${xi}_${0}`).name;
    for (let yi = 1; yi < ySize; yi++) {
      const curBlockId = grid.get(`${xi}_${yi}`).name;
      cmds.push(`merge [${lastBlockId}] [${curBlockId}]`);
      lastBlockId = `${maxBlockId + cmds.length}`;
    }
    rowNewBlockIds.push(lastBlockId);
  }

  // Merge columns.
  let lastBlockId = rowNewBlockIds[0];
  for (let xi = 1; xi < xSize; xi++) {
    cmds.push(`merge [${lastBlockId}] [${rowNewBlockIds[xi]}]`);
    lastBlockId = `${maxBlockId + cmds.length}`;
  }

  return cmds.join("\n");
}

function generateSplitXCmds(cmdContext, blockId, point) {
  return [`cut [${blockId}] [x] [${point.x}]`];
}

function generateSplitYCmds(cmdContext, blockId, point) {
  return [`cut [${blockId}] [y] [${point.y}]`];
}

function generateSplitXYCmds(cmdContext, blockId, point) {
  return [`cut [${blockId}] [${point.x}, ${point.y}]`];
}

function generateSwapCmds(cmdContext, blockId1, blockId2) {
  return [`swap [${blockId1}] [${blockId2}]`];
}

async function generateColorToMedCmds(cmdContext, blockId) {
  const block = cmdContext.solutionResult.blocks[blockId];
  const problemId = cmdContext.problemId;
  const geometricMedianData = await getGeometricMedian(problemId, block.begin.x, block.end.x, block.begin.y, block.end.y);

  return [`color [${blockId}] [${geometricMedianData?.color.join(", ")}]`];
}

async function generateBinarySolverCmds(cmdContext, blockId) {
  const code = cmdContext.code;
  const block = cmdContext.solutionResult.blocks[blockId];
  const problemId = cmdContext.problemId;

  let initialColor = [255,255,255,255];
  const colorPrefix = `color [${blockId}] `;
  for (let line of code.split("\n").reverse()) {
    if (line.startsWith(colorPrefix)) {
      initialColor = JSON.parse(line.slice(colorPrefix.length));
    }
  }
  console.log('initialColor = ', initialColor);

  isRunningSolver.set(true);
  const responseData = await getBinarySolverSolution(
    problemId, blockId, block.begin.x, block.end.x, block.begin.y, block.end.y,
    initialColor);
  isRunningSolver.set(false);

  return "# solver response\n" + responseData?.cmds.join("\n");
}

async function generateRectCmds(cmdContext, pt1, pt2) {
  let x0 = Math.min(pt1.x, pt2.x);
  let y0 = Math.min(pt1.y, pt2.y);
  let x1 = Math.max(pt1.x, pt2.x);
  let y1 = Math.max(pt1.y, pt2.y);
  console.log({x0, y0, x1, y1})

  // snap to grid
  if (x0 < 10) {
    x0 = 0;
  }
  if (x1 > 390) {
    x1 = 400
  }
  if (y0 < 10) {
    y0 = 0;
  }
  if (y1 > 390) {
    y1 = 400;
  }

  const problemId = cmdContext.problemId;
  const geometricMedianData = await getGeometricMedian(problemId, x0, x1, y0, y1);


  let cmds = []
  cmds.push(`\n### RECT ###`)

  const split = (a, pt) => {
    cmds.push(`cut [${a}] [${pt[0]}, ${pt[1]}] `)
    return [`${a}.0`, `${a}.1`, `${a}.2`, `${a}.3`]
  }

  const cut_y = (a, y) => {
    cmds.push(`cut [${a}] [y] [${y}]`)
    return [`${a}.0`, `${a}.1`]
  }

  const cut_x = (a, x) => {
    cmds.push(`cut [${a}] [x] [${x}]`)
    return [`${a}.0`, `${a}.1`]
  }


  // const currentBlockId = "0";
  const blocks = cmdContext.solutionResult.blocks;
  console.log(blocks);
  let maxBlockId = parseInt(_.max(Object.keys(blocks).map(id => JSON.parse(id.split(".")[0]))));
  console.log(maxBlockId);

  const merge = (a, b) => {
    if (a === undefined) return b;
    if (b === undefined) return a;
    cmds.push(`merge [${a}] [${b}]`);
    maxBlockId = maxBlockId + 1;
    return maxBlockId;
  }


  let cur = maxBlockId, b1, b2, b3, b4;
  if (y0 > 0) {
    [b1, cur] = cut_y(cur, y0);
  }
  if (x0 > 0) {
    [b2, cur] = cut_x(cur, x0);
  }
  if (y1 < 400) {
    [cur, b3] = cut_y(cur, y1);
  }
  if (x1 < 400) {
    [cur, b4] = cut_x(cur, x1);
  }

  cmds.push(`color [${cur}] [${geometricMedianData?.color.join(", ")}]`);

  cur = merge(cur, b4)
  cur = merge(cur, b3)
  cur = merge(cur, b2)
  cur = merge(cur, b1)

  // let [a0, a1, a2, a3] = split(cur, [x0, y0]);
  // cur = a2;
  // let [b0, b1, b2, b3] = split(cur, [x1, y1]);
  // cur = b0;
  // const top = merge(b2, b3);
  //
  // cur = merge(cur, b1);
  // cur = merge(cur, top);

  // const bottom = merge(a0, a1);
  // cur = merge(cur, a3);
  // cur = merge(cur, bottom);



  return cmds.join("\n")
}

async function pushCmdArg(cmdContext, arg) {
  const {code, setCode} = cmdContext;

  const cmd = activeCmd.get();
  if (!cmd) {
    return;
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

function Footer() {
  const [viewMode, setViewMode] = useAppState("viewMode");
  const _activeCmd = useStore(activeCmd);
  const _activeCmdArgs = useStore(activeCmdArgs);
  return (
    <Row className={tw`h-24 bg-gray-200 px-4`}>
      <Spacer flex={1}/>
      <h2 className={tw`text-2xl font-bold mb-4`}>{_activeCmd?.name} {_activeCmdArgs?.join(", ")}</h2>
      <Spacer size={5}/>
      <Button color='red' onClick={() => {
        activeCmd.set();
        activeCmdArgs.set();
      }}>Cancel</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "rect (clickTwoPoints)",
          codeGenerator: generateRectCmds,
          numArgs: 2
        });
        activeCmdArgs.set([]);
      }}>Rect</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "cut X (click on a block, and then point to split)",
          codeGenerator: generateSplitXCmds,
          numArgs: 2
        });
        activeCmdArgs.set([]);
      }}>Cut X</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "cut Y (click on a block, and then point to split)",
          codeGenerator: generateSplitYCmds,
          numArgs: 2
        });
        activeCmdArgs.set([]);
      }}>Cut Y</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "cut XY (click on a block, and then point to split)",
          codeGenerator: generateSplitXYCmds,
          numArgs: 2
        });
        activeCmdArgs.set([]);
      }}>Cut XY</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "swap (click two blocks)",
          codeGenerator: generateSwapCmds,
          numArgs: 2
        });
        activeCmdArgs.set([]);
      }}>Swap</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "color (click block to color to median)",
          codeGenerator: generateColorToMedCmds,
          numArgs: 1
        });
        activeCmdArgs.set([]);
      }}>Color to Med</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "merge range (click left/bottom block first, then the last one)",
          codeGenerator: generateMergeUpCmds,
          numArgs: 2
        });
        activeCmdArgs.set([]);
      }}>Merge Range</Button>
      <Spacer size={5}/>
      <Button color='blue' onClick={() => {
        activeCmd.set({
          name: "run solver (click block)",
          codeGenerator: generateBinarySolverCmds,
          numArgs: 1
        });
        activeCmdArgs.set([]);
      }}>Binary Solver</Button>
      <Spacer size={5}/>
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
