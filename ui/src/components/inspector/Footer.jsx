import _ from "lodash";
import React from "react";
import { useHotkeys } from 'react-hotkeys-hook';
import { useStore } from "@nanostores/react";
import { tw } from "twind";
import { useAppState } from "../../app-state";
import Spacer from "../common/Spacer";
import Button from "../common/Button";
import { Row } from "../common/Flex";
import {
  activeCmd,
  activeCmdArgs
} from "../Inspector.stores";
import { CMDs } from '../../utils/codegen';
import { pushCmdArg, tryRunCmd } from "./utils";

export function Footer() {
  const [viewMode, setViewMode] = useAppState("viewMode");
  const _activeCmd = useStore(activeCmd);
  const _activeCmdArgs = useStore(activeCmdArgs);
  const isCmdStackEmpty = !_activeCmd && _.size(_activeCmdArgs) == 0
  const resetCmdStack = () => {
    activeCmd.set();
    activeCmdArgs.set([]);
  };
  const activateCmd = (cmd) => {
    activeCmd.set(cmd);
    activeCmdArgs.set([]);
    tryRunCmd()
  };
  useHotkeys('Esc', () => resetCmdStack());
  useHotkeys('R', () => activateCmd(CMDs.rect));
  useHotkeys('X', () => activateCmd(CMDs.cutX));
  useHotkeys('Y', () => activateCmd(CMDs.cutY));
  useHotkeys('P', () => activateCmd(CMDs.cutXY));
  useHotkeys('C', () => activateCmd(CMDs.colorToMed));
  useHotkeys('M', () => activateCmd(CMDs.mergeRange));
  useHotkeys('B', () => activateCmd(CMDs.binarySolver));
  useHotkeys('L', () => activateCmd(CMDs.pixelSolver));
  return (
    <Row className={tw`h-24 bg-gray-200 px-4`}>
      {!isCmdStackEmpty &&
        <Button color='red' onClick={resetCmdStack}>Esc</Button>}
      <Spacer size={2} />
      <h2 className={tw`text-xl font-bold mb-1 flex-shrink-1`}>{_activeCmd?.name} {_activeCmdArgs?.map(arg => JSON.stringify(arg)).join(", ")}</h2>
      <Spacer flex={1} />
      <Row gutter={2} className={tw`flex-shrink-0`}>
        <Button color='blue' onClick={() => activateCmd(CMDs.rect)}>(R)ect</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.cutX)}>Cut (X)</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.cutY)}>Cut (Y)</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.cutXY)}>Cut XY (P)</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.swap)}>(S)wap</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.colorToMed)}>(C)olor to Med</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.mergeRange)}>(M)erge Range</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.binarySolver)}>(B)inary Solver</Button>
        <Button color='blue' onClick={() => activateCmd(CMDs.pixelSolver)}>Pixe(L) Solver</Button>
        <Button color='gray' onClick={() => setViewMode(viewMode == 'wide' ? null : 'wide')}>{viewMode == 'wide' ? 'Wi-i-i-i-de view' : 'Standard view'}</Button>
      </Row>
    </Row>
  );
}
