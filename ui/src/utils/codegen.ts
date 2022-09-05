import _ from "lodash";
import {
  getGeometricMedian,
  getBinarySolverSolution,
  getPixelSolverSolution,
} from "../api";
import { getAppState } from "../app-state";
import { isRunningSolver, solutionResult } from "../components/Inspector.stores";


const getMaxBlockId = () => _.max(Object.keys(solutionResult.get().blocks).map(id => JSON.parse(id.split(".")[0])));


export function generateLinearMergeCmds(cmdContext, startBlockId, endBlockId, direction) {
  const { solutionResult } = cmdContext;

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

  let findNext: Function;
  if (direction === 'up') {
    findNext = findNextUp;
  } else if (direction === "right") {
    findNext = findNextRight;
  } else {
    throw new Error(`Bad direction ${direction}`);
  }

  const cmds: String[] = [];
  let currentBlock = startBlock;
  let currentBlockId = startBlockId;
  const maxBlockId = _.max(Object.keys(solutionResult.blocks).map(id => JSON.parse(id.split(".")[0])));
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

export function generateMergeUpCmds(cmdContext, startBlockId, endBlockId) {
  const { solutionResult } = cmdContext;

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
        const block = blocks[blockId];
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
  const cmds: String[] = [];

  // Merge rows first.
  const rowNewBlockIds: String[] = [];
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

export function generateSplitXCmds(cmdContext, blockId, point) {
  return [`cut [${blockId}] [x] [${point.x}]`];
}
export function generateSplitYCmds(cmdContext, blockId, point) {
  return [`cut [${blockId}] [y] [${point.y}]`];
}
export function generateSplitXYCmds(cmdContext, blockId, point) {
  return [`cut [${blockId}] [${point.x}, ${point.y}]`];
}
export function generateSwapCmds(cmdContext, blockId1, blockId2) {
  return [`swap [${blockId1}] [${blockId2}]`];
}
export async function generateColorToMedCmds(cmdContext, blockId) {
  const block = cmdContext.solutionResult.blocks[blockId];
  const problemId = cmdContext.problemId;
  const geometricMedianData = await getGeometricMedian(problemId, block.begin.x, block.end.x, block.begin.y, block.end.y);

  return [`color [${blockId}] [${geometricMedianData?.color.join(", ")}]`];
}
export async function generateBinarySolverCmds(cmdContext, blockId) {
  const code = cmdContext.code;
  const block = cmdContext.solutionResult.blocks[blockId];
  const problemId = cmdContext.problemId;

  let initialColor = [255, 255, 255, 255];
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

export async function generatePixelSolverCmds(cmdContext, blockId) {
  const problemId = cmdContext.problemId;
  const solverExtraArgs = cmdContext.solverExtraArgs
  const block = cmdContext.solutionResult.blocks[blockId];
  const maxBlockId = getMaxBlockId()

  isRunningSolver.set(true);
  const responseData = await getPixelSolverSolution(
    problemId, blockId, block.begin.x, block.end.x, block.begin.y, block.end.y, maxBlockId,
    solverExtraArgs);
  isRunningSolver.set(false);

  return "# solver response\n" + responseData?.cmds.join("\n");
}

export async function generateRectCmds(cmdContext, pt1, pt2) {
  let x0 = Math.min(pt1.x, pt2.x);
  let y0 = Math.min(pt1.y, pt2.y);
  let x1 = Math.max(pt1.x, pt2.x);
  let y1 = Math.max(pt1.y, pt2.y);
  console.log({ x0, y0, x1, y1 })

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


  const cmds: String[] = [];
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


  let cur = maxBlockId as String, b1, b2, b3, b4;
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



type Command = {
  name: String,
  codeGenerator: Function,
  numArgs: Number,
  argTypes: String[],
}
type CommandsMap = {
  [key: string]: Command;
}
export const CMDs: CommandsMap = _.keyBy([
  {
    key: 'rect',
    name: "rect (clickTwoPoints)",
    codeGenerator: generateRectCmds,
    numArgs: 2,
    argTypes: ['point', 'point'],
  },
  {
    key: 'cutX',
    name: "cutX (click on a block, and then point to split)",
    codeGenerator: generateSplitXCmds,
    numArgs: 2,
    argTypes: ['block', 'point'],
  },
  {
    key: 'cutY',
    name: "cutY (click on a block, and then point to split)",
    codeGenerator: generateSplitYCmds,
    numArgs: 2,
    argTypes: ['block', 'point'],
  },
  {
    key: 'cutXY',
    name: "cutXY (click on a block, and then point to split)",
    codeGenerator: generateSplitXYCmds,
    numArgs: 2,
    argTypes: ['block', 'point'],
  },
  {
    key: 'swap',
    name: "swap (click two blocks)",
    codeGenerator: generateSwapCmds,
    numArgs: 2,
    argTypes: ['block', 'block'],
  },
  {
    key: 'colorToMed',
    name: "color (click block to color to median)",
    codeGenerator: generateColorToMedCmds,
    numArgs: 1,
    argTypes: ['block'],
  },
  {
    key: 'mergeRange',
    name: "merge range (click left/bottom block first, then the last one)",
    codeGenerator: generateMergeUpCmds,
    numArgs: 2,
    argTypes: ['block', 'block'],
  },
  {
    key: 'binarySolver',
    name: "run binary solver (click block)",
    codeGenerator: generateBinarySolverCmds,
    numArgs: 1,
    argTypes: ['block'],
  },
  {
    key: 'pixelSolver',
    name: "run pixel solver (click block)",
    codeGenerator: generatePixelSolverCmds,
    numArgs: 1,
    argTypes: ['block'],
  },
], 'key')
