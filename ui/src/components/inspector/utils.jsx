import _ from "lodash";
import { getAppState, setAppState } from "../../app-state";
import {
  solutionResult, activeCmd,
  activeCmdArgs
} from "../Inspector.stores";

function buildCmdContext() {
  const code = getAppState('currentCode');
  const problemId = getAppState('currentProblemId');
  const cmd = activeCmd.get();
  const solverExtraArgs = getAppState(`solverExtraArgs.${cmd.key}`)
  const cmdContext = {
    cmdKey: cmd.key,
    solutionResult: solutionResult.get(),
    problemId: problemId,
    code: code,
    solverExtraArgs: solverExtraArgs,
  }
  return cmdContext
}

export async function tryRunCmd() {
  const code = getAppState('currentCode');
  const setCode = (code) => setAppState('currentCode', code);
  const cmd = activeCmd.get()
  const cmdContext = buildCmdContext()

  const args = activeCmdArgs.get()
  if (!cmd || args.length < cmd.numArgs) {
    return
  }
  const newCode = await cmd.codeGenerator(cmdContext, ...args);
  if (newCode) {
    setCode(code + "\n" + newCode);
  }
  activeCmd.set();
  activeCmdArgs.set();
}

export async function pushCmdArg({ block, point }) {
  const code = getAppState('currentCode');
  const setCode = (code) => setAppState('currentCode', code);
  const cmd = activeCmd.get();
  const cmdContext = buildCmdContext()

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
