import React from "react";
import _ from 'lodash'
import { apply, tw } from "twind";


const Block = (props) => {
    const { block, highlighted, color = 'red', onClick, onMouseOver, onMouseLeave, ...otherProps } = props
    const size = block.getSize();
    const borderWidth = 2;
    const blockCls = tw(
        apply`absolute
            w-[${size.x}px] h-[${size.y}px]
            left-[${block.begin.x - borderWidth}px] bottom-[${block.begin.y - borderWidth}px]
            bg-transparent border-${borderWidth} box-content border-transparent
        `,
        highlighted &&
        `bg-[rgba(255,255,255,0.35)] border-${color}-500`
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
            {...otherProps}
        >
            <span className={labelCls}>{block.name}</span>
        </div>
    );
}

// highlightedBlocks = {
//   $blockId: $color
// }

export function HintBlocks({ blocks, onClickBlock, onMouseOverBlock, onMouseLeaveBlock, highlightedBlocks={} }) {
    return _.map(blocks, block => (
        <Block
            key={block.name}
            block={block}
            color={highlightedBlocks[block.name]}
            highlighted={block.name in highlightedBlocks}
            onClick={(ev) => onClickBlock(block.name, ev)}
            onMouseOver={(ev) => onMouseOverBlock(block.name, ev)}
            onMouseLeave={(ev) => onMouseLeaveBlock(block.name, ev)}
        />
    ))
}
