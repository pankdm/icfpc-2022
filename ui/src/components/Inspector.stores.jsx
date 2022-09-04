import { atom } from "nanostores";
import { getCtxPixel, getCtxPixels } from "../utils/utils";


export const problemPicture = atom();

export function getProblemPixels(width, height) {
    const ctx = problemPicture.get()?.ctx;
    return getCtxPixels(ctx, width, height);
}
export function getProblemPixel(x, y) {
    const ctx = problemPicture.get()?.ctx;
    return getCtxPixel(ctx, x, y);
}

export const solutionPicture = atom();

export function getSolutionPixels(width, height) {
    const ctx = solutionPicture.get()?.ctx;
    return getCtxPixels(ctx, width, height);
}
export function getSolutionPixel(x, y) {
    const ctx = solutionPicture.get()?.ctx;
    return getCtxPixel(ctx, x, y);
}


export const solutionResult = atom();
export const solutionError = atom();
export const solutionPirctureDiffCost = atom();

export const hoveredBlockId = atom();
export const hoveredBlock = atom();
export const previewBlockIds = atom();
export const clickedBlock = atom();
export const clickedBlockMedianColor = atom();
export const previewLOC = atom();
export const selectedPixel = atom();
export const activeCmd = atom();
export const activeCmdArgs = atom();

export const isRunningSolver = atom();
