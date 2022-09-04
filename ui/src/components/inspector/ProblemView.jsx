import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { tw } from "twind";
import { getProblemImgUrl } from "../../api";
import { useAppState } from "../../app-state";
import { getCtxFullImageData, getPictureDifferenceCost, getCtxPixel, useUnmount } from "../../utils/utils";
import { Crosshair } from "../common/Crosshair";
import {
  problemPicture,
  solutionPicture,
  solutionPirctureDiffCost,
  hoveredBlock,
  selectedPixel,
  activeCmd
} from "../Inspector.stores";
import { HintBlocksView } from "./HintBlocksView";
import { pushCmdArg } from "./utils";

function TargetPictureCanvas({ problemId, width, height, ...props }) {
  const canvasRef = useRef();
  const [hoverBlocks] = useAppState('config.hoverBlocksOnBothSides');
  useLayoutEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!problemId) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      problemPicture.set();
      return;
    }
    const img = new Image()
    img.src = getProblemImgUrl(problemId)
    img.crossOrigin = "anonymous"
    img.addEventListener("load", () => {
      // const canvas = document.createElement('canvas')
      // const ctx = canvas.getContext('2d')
      // canvas.width = 400
      // canvas.height = 400
      const ctx = canvasRef.current.getContext('2d')
      img.style.display = "none";
      // console.log('read full image data')
      const picturePixelData = getCtxFullImageData(ctx, width, height);
      problemPicture.set({
        img: img,
        pixelData: picturePixelData,
        canvas: canvasRef.current,
      })
      // console.log('draw!')
      ctx.drawImage(img, 0, 0);
      // console.log('done')
      const solutionPixelData = solutionPicture.get()?.pixelData;
      if (solutionPixelData) {
        solutionPirctureDiffCost.set(
          getPictureDifferenceCost(
            solutionPixelData,
            picturePixelData,
            400,
            400
          )
        )
      }
    })
  }, [problemId])
  const _activeCmd = useStore(activeCmd);
  const _selectedPixel = useStore(selectedPixel);

  const getPixel = (event) => {
    const canvasBoundingRect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d')
    const x = event.clientX - canvasBoundingRect.x;
    const y = event.clientY - canvasBoundingRect.y;
    const yFlip = canvasBoundingRect.height - (event.clientY - canvasBoundingRect.y);
    const pixel = {
      x: Math.floor(x),
      y: Math.floor(yFlip),
      rgba: getCtxPixel(ctx, x, y).data
    };
    return pixel;
  };

  const onClickPixel = (event) => {
    const pixel = getPixel(event);
    selectedPixel.set(pixel);
    if (_activeCmd) {
      const { x, y } = pixel;
      const _hoveredBlock = hoveredBlock.get()
      pushCmdArg({ point: { x, y }, block: _hoveredBlock?.name });
    }
  };

  const [dragging, setDragging] = useState(false);
  const onMouseDown = (event) => {
    setDragging(true);
    const pixel = getPixel(event);
    selectedPixel.set(pixel);
  };
  const onMouseMove = (event) => {
    if (!dragging && !_activeCmd)
      return;
    const pixel = getPixel(event);
    selectedPixel.set(pixel);
  };
  const onMouseUp = () => {
    setDragging(false);
  };
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
        {...props} />
      {_selectedPixel && <Crosshair width={400} height={400} x={_selectedPixel.x} y={_selectedPixel.y} />}
      <HintBlocksView showPreviewBlocks={false} disablePointerEvents={!hoverBlocks} showLabels={false} highlightedBlockBg='transparent' />
    </div>
  );
}
export function ProblemView() {
  const { problemId } = useParams();

  return (
    <div className={tw`flex-1 flex flex-col items-center justify-center`}>
      <h1 className={tw`text-4xl font-bold mb-4`}>Problem {problemId}</h1>
      <div className={tw`relative border`}>
        {problemId
          ? <TargetPictureCanvas
            problemId={problemId}
            width={400}
            height={400} />
          : <div className={tw`flex items-center justify-center w-[400px] h-[400px]`}>
            Picture will show here
          </div>}
      </div>
    </div>
  );
}
