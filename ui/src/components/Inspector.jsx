import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import _ from "lodash";
import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";
import { tw } from "twind";
import { getGeometricMedian } from "../api";
import Spacer from "./common/Spacer";
import { Col, Row } from "./common/Flex";

// Core Views
import { SideBar } from "./inspector/SideBar";
import { Header } from "./inspector/Header";
import { ProblemView } from "./inspector/ProblemView";
import { SolutionView } from "./inspector/SolutionView";
import { Footer } from "./inspector/Footer";

import {
  problemPicture,

  solutionPicture,
  solutionResult,
  solutionPirctureDiffCost,

  hoveredBlock,
  hoveredBlockId,
  previewBlockIds,
  clickedBlock,
  clickedBlockMedianColor,
  previewLOC,
  getProblemPixel,
  getSolutionPixel,
  selectedPixel,

  isRunningSolver,
} from "./Inspector.stores";

import { getBlockDifferenceCost } from "../utils/utils";



window.solutionResult = solutionResult;
window.problemPicture = problemPicture;
window.solutionPicture = solutionPicture;
window.getProblemPixel = getProblemPixel;
window.getSolutionPixel = getSolutionPixel;





function MainView() {
  const differenceCost = useStore(solutionPirctureDiffCost);
  const _solutionResult = useStore(solutionResult);
  const actionsCots = _solutionResult?.actionsCost;
  const totalActionsCost = _.sum(actionsCots);
  const _selectedPixel = useStore(selectedPixel);
  const { problemId } = useParams()
  const _isRunningSolver = useStore(isRunningSolver);

  const _clickedBlock = useStore(clickedBlock);

  const geometricMedianArgs = _clickedBlock && [
    _clickedBlock.begin.x,  // x1
    _clickedBlock.end.x,    // x2
    _clickedBlock.begin.y,  // y1
    _clickedBlock.end.y,    // y2
  ]
  const { data: geometricMedianData } = useQuery(
    ['geometricMedian', problemId, geometricMedianArgs],
    () => getGeometricMedian(problemId, ...geometricMedianArgs),
    {
      enabled: problemId && !!_clickedBlock,
    }
  );

  if (problemId && _clickedBlock) {
    clickedBlockMedianColor.set(geometricMedianData);
  } else {
    clickedBlockMedianColor.set();
  }

  const blockDifferenceCost = useMemo(() => {
    if (!_clickedBlock) return
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


export default function Inspector() {
  return (
    <div className={tw`min-w-[900px] min-h-screen flex flex-col overflow-hidden`}>
      <Header />
      <div className={tw`flex-1 flex overflow-hidden`}>
        <SideBar className={tw`z-10`} />
        <MainView />
      </div>
      <Footer />
    </div>
  );
}
