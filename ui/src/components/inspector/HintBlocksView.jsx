import React, { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { HintBlocks } from "./PreviewBlocks";
import {
  solutionResult,
  previewBlockIds,
  hoveredBlockId,
  hoveredBlock
} from "../Inspector.stores";

export function HintBlocksView({ className, onClickBlock, showLabels = true, showPreviewBlocks = true, highlightedBlockBg, disablePointerEvents = false }) {
  const _solutionResult = useStore(solutionResult);
  const blocks = _solutionResult?.blocks;

  const _hoveredBlock = useStore(hoveredBlock);
  const _previewBlockIds = useStore(previewBlockIds);
  const highlightedBlocks = useMemo(() => {
    const highlights = {};
    if (showPreviewBlocks) {
      _previewBlockIds?.forEach(previewId => {
        highlights[previewId] = 'blue';
      });
    }
    if (_hoveredBlock) {
      highlights[_hoveredBlock.name] = 'red';
    }
    return highlights;
  }, [_hoveredBlock, _previewBlockIds]);
  const onMouseLeaveBlock = () => {
    hoveredBlockId.set();
    hoveredBlock.set();
  };
  const onMouseEnterBlock = (blockId, ev) => {
    hoveredBlockId.set(blockId);
    hoveredBlock.set(blocks && blocks[blockId]);
  };

  return blocks && (
    <HintBlocks
      className={className}
      blocks={blocks}
      highlightedBlocks={highlightedBlocks}
      highlightedBlockBg={highlightedBlockBg}
      showLabels={showLabels}
      disablePointerEvents={disablePointerEvents}
      onClickBlock={onClickBlock}
      onMouseOverBlock={onMouseEnterBlock}
      onMouseLeaveBlock={onMouseLeaveBlock} />
  );
}
