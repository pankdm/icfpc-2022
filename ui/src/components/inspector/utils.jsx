import _ from "lodash";
import { getAppState, setAppState } from "../../app-state";
import {
  solutionResult, activeCmd,
  activeCmdArgs
} from "../Inspector.stores";

export async function pushCmdArg({ block, point }) {
  const code = getAppState('currentCode');
  const setCode = (code) => setAppState('currentCode', code);
  const problemId = getAppState('currentProblemId');
  const cmdContext = {
    solutionResult: solutionResult.get(),
    problemId: problemId,
    code: code,
  };

  const cmd = activeCmd.get();
  if (!cmd) {
    return;
  }
  const expectedArgType = cmd.argTypes[_.size(activeCmdArgs.get())];
  const arg = { block, point }[expectedArgType];
  if (!arg) {
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
