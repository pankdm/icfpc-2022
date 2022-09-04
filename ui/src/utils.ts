import _ from 'lodash'
import { useEffect, useLayoutEffect, useRef, useState } from "react"

export const sleep = (delayMs = 100) => new Promise((res, rej) => setTimeout(res, delayMs))

export function useOnChange(value, callback = _.noop) {
    const [prevValue, setPrevValue] = useState(value)
    useEffect(() => {
        if (prevValue === value) return
        setPrevValue(value)
        callback(value, prevValue)
    }, [value])
}

export function useUnmount(effect: () => void) {
    const effectRef = useRef(effect);
    effectRef.current = effect;

    useEffect(() => {
        return () => {
            effectRef.current();
        };
    }, []);
}

export function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;

    return ref;
}

export function usePersist<T extends (...args: any[]) => any>(callback: T): T {
    const resultRef = useRef<T>();
    const callbackRef = useLatestRef(callback);

    if (!resultRef.current) {
        resultRef.current = function (this: any, ...args) {
            return callbackRef.current.apply(this, args);
        } as T;
    }

    return resultRef.current;
}

// export function useRaf(callback: () => void) {
//     const timerRef = useRef<number>();
//     const callbackRef = useLatestRef(callback);

//     const cancel = usePersist(() => {
//         if (timerRef.current !== undefined) {
//             cancelAnimationFrame(timerRef.current);
//             timerRef.current = undefined;
//         }
//     });

//     const start = usePersist(() => {
//         cancel();
//         timerRef.current = requestAnimationFrame(() => {
//             callbackRef.current();
//         });
//     });

//     useUnmount(cancel);
//     start()
//     // return [start, cancel] as const;
// }

export function useRaf(callback, deps = []) {
    let play = true
    const loop = () => {
        callback()
        if (play) {
            requestAnimationFrame(loop)
        }
    }
    useEffect(() => {
        loop()
        return () => {
            play = false
        }
    }, deps)
}

export class Vec {
    x: Number
    y: Number
    constructor(x: Number, y: Number) {
        this.x = x
        this.y = y
    }
}
export class Rect {
    begin: Vec
    end: Vec
    constructor(begin: Vec, end: Vec) {
        this.begin = begin
        this.end = end
    }
    getSize() {
        return new Vec(this.end.x - this.begin.x, this.end.y - this.begin.y)
    }
    getSqSize() {
        return (this.end.x - this.begin.x) * (this.end.y - this.begin.y)
    }
}

enum ActionsBaseCost {
    LINE_CUT = 7,
    POINT_CUT = 10,
    COLOR = 5,
    SWAP = 3,
    MERGE = 1,
}

const CANVAS_SIZE_X = 400
const CANVAS_SIZE_Y = 400
const CANVAS_SIZE = CANVAS_SIZE_X * CANVAS_SIZE_Y

function getTotalActionCost(actionCost: ActionsBaseCost, smallestBlockSize) {
    return Math.round(actionCost * CANVAS_SIZE / smallestBlockSize)
}

export class Block extends Rect {
    name: String
    constructor(name, begin, end) {
        super(begin, end)
        this.name = name
    }

    static serializeMap(blocksMap) {
        return _.mapValues(blocksMap, (b: Block) => [b.name, [b.begin.x, b.begin.y], [b.end.x, b.end.y]])
    }

    static deserializeMap(blocksMap) {
        return _.mapValues(blocksMap, (data) => new Block(data[0], new Vec(...data[0]), new Vec(...data[1])))
    }

    cutX(x: Number) {
        const { x: x0, y: y0 } = this.begin
        const { x: x1, y: y1 } = this.end
        if (x <= x0 || x >= x1) {
            throw new Error(`Invalid cut at {X:${x}} for block ((${x0}, ${y0}), (${x1}, ${y1}))`)
        }

        const left = new Block(this.name + ".0", new Vec(x0, y0), new Vec(x, y1))
        const right = new Block(this.name + ".1", new Vec(x, y0), new Vec(x1, y1))

        return [left, right]
    }

    cutY(y: Number) {
        const { x: x0, y: y0 } = this.begin
        const { x: x1, y: y1 } = this.end
        if (y <= y0 || y >= y1) {
            throw new Error(`Invalid cut at {Y:${y}} for block ((${x0}, ${y0}), (${x1}, ${y1}))`)
        }

        const bottom = new Block(this.name + ".0", new Vec(x0, y0), new Vec(x1, y))
        const top = new Block(this.name + ".1", new Vec(x0, y), new Vec(x1, y1))

        return [bottom, top]
    }

    pointCut(pt: Vec) {
        const pt_x = pt.x
        const pt_y = pt.y

        const { x: x0, y: y0 } = this.begin
        const { x: x1, y: y1 } = this.end

        const bottom_left = new Block(this.name + ".0", new Vec(x0, y0), new Vec(pt_x, pt_y))
        const botom_right = new Block(this.name + ".1", new Vec(pt_x, y0), new Vec(x1, pt_y))
        const top_right = new Block(this.name + ".2", new Vec(pt_x, pt_y), new Vec(x1, y1))
        const top_left = new Block(this.name + ".3", new Vec(x0, pt_y), new Vec(pt_x, y1))

        return [bottom_left, botom_right, top_right, top_left]
    }

    color(drawCtx: CanvasRenderingContext2D, r, g, b, a) {
        drawCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`
        // NOTE: contest's Y axis is headed bottom-up
        //       while 2D canvas are aimed top-down
        const x = this.begin.x;
        const y = 400 - this.end.y;
        const width = this.end.x - this.begin.x;
        const height = this.end.y - this.begin.y;
        drawCtx.fillRect(x, y, width, height);
    }

    swap(drawCtx: CanvasRenderingContext2D, other: Block) {
        const { x: x0, y: y0 } = this.begin
        const { x: x1, y: y1 } = this.end
        const { x: x2, y: y2 } = other.begin
        const { x: x3, y: y3 } = other.end
        const width = x1 - x0
        const height = y1 - y0
        const otherWidth = x3 - x2
        const otherHeight = y3 - y2
        if (width != otherWidth || height != otherHeight) {
            throw new Error(`Invalid swap for blocks ((${x0}, ${y0}), (${x1}, ${y1})) and ((${x2}, ${y2}), (${x3}, ${y3}))`)
        }

        this.begin = new Vec(x2, y2)
        this.end = new Vec(x3, y3)
        other.begin = new Vec(x0, y0)
        other.end = new Vec(x1, y1)
        // NOTE: contest's Y axis is headed bottom-up
        //       while 2D canvas are aimed top-down
        const image = drawCtx.getImageData(x0, 400 - y1, width, height)
        const otherImage = drawCtx.getImageData(x2, 400 - y3, otherWidth, otherHeight)
        const imageCopy = new ImageData(
            new Uint8ClampedArray(image.data),
            image.width,
            image.height
        )
        const otherImageCopy = new ImageData(
            new Uint8ClampedArray(otherImage.data),
            otherImage.width,
            otherImage.height
        )
        drawCtx.putImageData(imageCopy, x2, 400 - y3)
        drawCtx.putImageData(otherImageCopy, x0, 400 - y1)
    }

    merge(other: Block, newName) {
        const { x: x0, y: y0 } = this.begin
        const { x: x1, y: y1 } = this.end
        const { x: x2, y: y2 } = other.begin
        const { x: x3, y: y3 } = other.end
        const merged = new Block(newName, new Vec(_.min([x0, x2]), _.min([y0, y2])), new Vec(_.max([x1, x3]), _.max([y1, y3])))
        if (merged.getSqSize() != this.getSqSize() + other.getSqSize()) {
            throw new Error(`Invalid merge for blocks ((${x0}, ${y0}), (${x1}, ${y1})) and ((${x2}, ${y2}), (${x3}, ${y3})).`);
        }

        return merged;
    }
}

export function parseBlockIdsFromCommand(instruction: String) {
    let _instruction = instruction.split('#', 1).toString().trim()
    if (!_instruction) {
        return []
    }
    let cmd = instruction.match(/^\w+/)[0]
    let args = [...instruction.matchAll(/(\[[^\]]+\])/g)].map(m => m[0])
    let blockId = args[0]
    args = args.slice(1)
    blockId = blockId.slice(1, -1)
    if (!blockId) {
        return;
    }
    let blocks = [blockId]
    if (cmd == "cut") {
        // also return results of all possible split
        blocks.push(`${blockId}.0`);
        blocks.push(`${blockId}.1`);
        blocks.push(`${blockId}.2`);
        blocks.push(`${blockId}.3`);
    }

    if (cmd == "swap" || cmd == "merge") {
        let otherBlockId = args[0]
        otherBlockId = otherBlockId.slice(1, -1)
        blocks.push(otherBlockId);
    }
    return blocks;
}


function executeCommand(blocks: Object, instruction: String, actionsCost: Number[], drawCtx: CanvasRenderingContext2D, shadowDrawCtx: CanvasRenderingContext2D) {
    let _instruction = instruction.split('#', 1).toString().trim()
    if (!_instruction) {
        actionsCost.push(0)
        return
    }
    let cmd, blockId, args
    cmd = instruction.match(/^\w+/)[0]
    // split into wrapped args wrapped in [ ]
    args = [...instruction.matchAll(/(\[[^\]]+\])/g)].map(m => m[0])
    blockId = args[0]
    args = args.slice(1)
    blockId = blockId.slice(1, -1)
    const block: Block = blocks[blockId]
    if (!block) {
        throw new Error(`Incorrect blockId ${instruction}`)
    }
    if (cmd == 'cut') {
        let newBlocks: Block[]
        let baseActionCost
        if (args.length == 1) {
            const pointStr = args[0]
            const point: Vec = new Vec(...JSON.parse(pointStr))
            newBlocks = block.pointCut(point)
            baseActionCost = ActionsBaseCost.POINT_CUT
            delete blocks[blockId]
        } else {
            let [dir, cutCoordStr] = args
            dir = dir.toLowerCase()
            const cutCoord: Number = JSON.parse(cutCoordStr)[0]
            baseActionCost = ActionsBaseCost.LINE_CUT
            if (dir == '[y]') {
                newBlocks = block.cutY(cutCoord)
                delete blocks[blockId]
            } else if (dir == '[x]') {
                newBlocks = block.cutX(cutCoord)
                delete blocks[blockId]
            } else {
                throw new Error('Incorrect cut direction')
            }
        }
        newBlocks.forEach(b => { blocks[b.name] = b })
        actionsCost.push(getTotalActionCost(baseActionCost, block.getSqSize()))
    } else if (cmd == 'color') {
        const [r, g, b, a]: Number[] = JSON.parse(args)
        actionsCost.push(getTotalActionCost(ActionsBaseCost.COLOR, block.getSqSize()))
        block.color(drawCtx, r, g, b, a)
    } else if (cmd == 'swap') {
        let otherBlockId = args[0]
        otherBlockId = otherBlockId.slice(1, -1)
        const otherBlock: Block = blocks[otherBlockId]
        block.swap(drawCtx, otherBlock)
        actionsCost.push(getTotalActionCost(ActionsBaseCost.SWAP, block.getSqSize()))
    } else if (cmd == 'merge') {
        let otherBlockId = args[0]
        otherBlockId = otherBlockId.slice(1, -1)
        const otherBlock: Block = blocks[otherBlockId]
        const maxBlockId = _.max(Object.keys(blocks).map(id => JSON.parse(id.split(".")[0])))
        const nextBlockId = `${maxBlockId + 1}`
        const newBlock = block.merge(otherBlock, nextBlockId)
        blocks[nextBlockId] = newBlock
        delete blocks[blockId]
        delete blocks[otherBlockId]
        actionsCost.push(getTotalActionCost(ActionsBaseCost.MERGE, _.max([block.getSqSize(), otherBlock.getSqSize()])));
    }
    return actionsCost
}

export function computeBlocksAndDraw(initialState, instructions, drawCtx, shadowDrawCtx) {
    const codeLines = instructions.split('\n').map(cmd => cmd.trim())
    let blocks = { '0': new Block('0', new Vec(0, 0), new Vec(400, 400)) }

    if (initialState) {
        blocks = initialState.blocks.map((block) => {
            const blk = new Block(
                block.blockId,
                new Vec(block.bottomLeft[0], block.bottomLeft[1]),
                new Vec(block.topRight[0], block.topRight[1]));
            blk.color(drawCtx, block.color[0], block.color[1], block.color[2], block.color[3])
            return blk;
        })
        blocks = _.keyBy(blocks, 'name')
    }

    const actionsCost = []
    let line = 0
    try {
        for (; line < codeLines.length; line++) {
            // console.log(line + 1, codeLines[line])
            executeCommand(blocks, codeLines[line], actionsCost, drawCtx, shadowDrawCtx)
        }
        return {
            result: 'success',
            blocks: blocks,
            actionsCost: actionsCost,
        }
    } catch (err) {
        console.error(`Error executing line ${line + 1}: ${codeLines[line]}`)
        console.error(err)
        return {
            result: 'error',
            errorLine: line,
            error: err,
            blocks: blocks,
            actionsCost: actionsCost,
        }
    }
}


export function getCtxPixel(ctx: CanvasRenderingContext2D, x, y) {
    const imageData = ctx.getImageData(x, y, 1, 1)
    return imageData
}
export function getCtxImageData(ctx: CanvasRenderingContext2D, x, y, w, h) {
    const imageData = ctx.getImageData(x, y, w, h)
    return imageData.data;
}
export function getCtxFullImageData(ctx: CanvasRenderingContext2D, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h)
    return imageData.data;
}
export function getCtxPixels(ctx, width, height) {
    const pixels = new Uint8ClampedArray(height * width * 4)
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < height; i++) {
            const idx = 4 * (width * j + i)
            const pixel = getCtxPixel(ctx, i, j)
            pixels[idx + 0] = pixel[0]
            pixels[idx + 1] = pixel[1]
            pixels[idx + 2] = pixel[2]
            pixels[idx + 3] = pixel[3]
        }
    }
    return pixels
}

export function getPictureDifferenceCost(pixelData1: Uint8ClampedArray, pixelData2: Uint8ClampedArray) {
    const rgba1 = pixelData1
    const rgba2 = pixelData2
    const alpha = 0.005
    let pixels = 0
    let pixelsWithDiff = 0
    let diff = 0
    for (let j = 0; j < pixelData1.length; j += 4) {
        pixels += 1
        const r1 = rgba1[j + 0]
        const g1 = rgba1[j + 1]
        const b1 = rgba1[j + 2]
        const a1 = rgba1[j + 3]

        const r2 = rgba2[j + 0]
        const g2 = rgba2[j + 1]
        const b2 = rgba2[j + 2]
        const a2 = rgba2[j + 3]
        diff += Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2)
        if (diff > 0) pixelsWithDiff++
    }
    const diffCost = Math.round(diff * alpha)
    return diffCost
}

export function getSquareMedianColor(pixelData: Uint8ClampedArray) {
    const rgba = pixelData
    let mr = 0
    let mg = 0
    let mb = 0
    let ma = 0
    const lenSq = (rgba.length/4)**2
    for (let j = 0; j < rgba.length; j += 4) {
        mr += rgba[j + 0]**2/lenSq
        mg += rgba[j + 1]**2/lenSq
        mb += rgba[j + 2]**2/lenSq
        ma += rgba[j + 3]**2/lenSq
    }
    return [mr, mg, mb, ma]
}

export function getBlockDifferenceCost(pixelData1: Uint8ClampedArray, pixelData2: Uint8ClampedArray, block) {
    const rgba1 = pixelData1
    const rgba2 = pixelData2
    const alpha = 0.005
    let pixels = 0
    let diff = 0

    for (let y = block.begin.y; y < block.end.y; ++y) {
        for (let x = block.begin.x; x < block.end.x; ++x) {
            const invY = 400 - (y + 1);
            const j = (x + invY * 400) * 4;
            pixels += 1
            const r1 = rgba1[j + 0]
            const g1 = rgba1[j + 1]
            const b1 = rgba1[j + 2]
            const a1 = rgba1[j + 3]

            const r2 = rgba2[j + 0]
            const g2 = rgba2[j + 1]
            const b2 = rgba2[j + 2]
            const a2 = rgba2[j + 3]
            diff += Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2)
        }
    }
    const diffCost = Math.round(diff * alpha)
    // console.log("difference for block", block, diff);
    return diffCost
}
