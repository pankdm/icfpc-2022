import React from "react";
import _ from 'lodash'
import { apply, tw } from "twind";


const Block = ({ className, block, highlighted, highlightedClassName, showLabel, color='red', onClick, onMouseOver, onMouseLeave, ...props}) => {
    const size = block.getSize();
    const borderWidth = 2;
    const blockCls = tw(
        apply`absolute
            w-[${size.x}px] h-[${size.y}px]
            left-[${block.begin.x - borderWidth}px] bottom-[${block.begin.y - borderWidth}px]
            bg-transparent border-${borderWidth} box-content border-transparent
        `,
        className,
        highlighted &&
        `bg-[rgba(255,255,255,0.35)] border-${color}-500`,
        highlighted &&
        highlightedClassName,
    );
    const labelCls = tw(
        apply`absolute bottom-full text-${color}-500 font-bold hidden z-10 pointer-events-none`,
        highlighted && `inline`
    );
    return (
        <div
            className={blockCls}
            onClick={onClick}
            onMouseEnter={onMouseOver}
            onMouseLeave={onMouseLeave}
            {...props}
        >
            {showLabel && <span className={labelCls}>{block.name}</span>}
        </div>
    );
}

// highlightedBlocks = {
//   $blockId: $color
// }

export function HintBlocks({
    blocks,
    highlightedBlocks={},
    highlightedBlockBg,
    showLabels=true,
    disablePointerEvents=false,
    onClickBlock=_.noop,
    onMouseOverBlock=_.noop,
    onMouseLeaveBlock=_.noop,
    className,
}) {
    return (
        <div className={tw(disablePointerEvents && apply`pointer-events-none`, className)}>
            {_.map(blocks, block => (
                <Block
                    key={block.name}
                    block={block}
                    color={highlightedBlocks[block.name]}
                    highlighted={block.name in highlightedBlocks}
                    highlightedClassName={`bg-[${highlightedBlockBg}]`}
                    showLabel={showLabels}
                    onClick={(ev) => onClickBlock(block.name, ev)}
                    onMouseOver={(ev) => onMouseOverBlock(block.name, ev)}
                    onMouseLeave={(ev) => onMouseLeaveBlock(block.name, ev)}
                />
            ))}
        </div>
    )
}
