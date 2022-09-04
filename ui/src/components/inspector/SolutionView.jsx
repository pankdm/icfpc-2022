import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";
import { tw } from "twind";
import { getProblemInitialState } from "../../api";
import { useAppState } from "../../app-state";
import {
  problemPicture,
  solutionResult,
  solutionError,
  solutionPirctureDiffCost,
  previewLOC,
  hoveredBlock,
  clickedBlock,
  activeCmd,
} from "../../stores";
import {
  computeBlocksAndDraw,
  getCtxFullImageData,
  getPictureDifferenceCost
} from "../../utils/utils";
import { HintBlocksView } from "./HintBlocksView";
import { pushCmdArg } from "./utils";

import { solutionPicture } from "../Inspector.stores";

export function SolutionCanvas({ solution, width, height, ...props }) {
  const { problemId } = useParams();
  const { data } = useQuery(["problemInitialState" + problemId], () => getProblemInitialState(problemId));
  const canvasRef = useRef();
  const canvasShadowRef = useRef();
  const justCode = solution
    .split("\n")
    .map((s) => s.split("#", 1).toString().trim())
    .join("\n");

  const computeCodeAndDraw = (initialState, code, width, height) => {
    const { ctx, shadowCtx } = solutionPicture.get();
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
  };

  useEffect(() => {
    if (!data || !justCode || !canvasRef.current || !canvasShadowRef.current)
      return;
    const ctx = canvasRef.current.getContext("2d");
    const shadowCtx = canvasShadowRef.current.getContext("2d");
    if (!ctx || !shadowCtx)
      return;
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
        {...props} />
      <canvas
        id="solution-canvas-shadow"
        ref={canvasShadowRef}
        width={width}
        height={height}
        className={tw`hidden`} />
    </>
  );
}



export function SolutionView() {
  const [code] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const _previewLOC = useStore(previewLOC);
  const _activeCmd = useStore(activeCmd);
  let filteredCode = code;
  if (_previewLOC && code) {
    filteredCode = code.split('\n').slice(0, _previewLOC + 1).join('\n');
  }
  const onClickBlock = (blockId, ev) => {
    const block = _solutionResult?.blocks[blockId];
    clickedBlock.set(block);
    if (_activeCmd) {
      pushCmdArg({ block: hoveredBlock.get().name });
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
