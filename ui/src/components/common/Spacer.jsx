import React from 'react'
import _ from 'lodash'
import { tw } from "twind";
import { forwardRef } from 'react';

export default function Spacer({ flex=0, size=4 }) {
  const flexGrow = flex && (_.isNumber(flex) ? flex : 1)
  return <div className={tw(`p-${size}`, 'flex-shrink-0', flex && `flex-grow-${flexGrow}`)}/>
}

export const Interspaced = forwardRef(({ gutter=4, children, ...props }, ref) => {
  return (
    <div ref={ref} {...props}>
      {_.map(children, (child, idx) => (
        <React.Fragment key={idx}>
          {idx != 0 && <Spacer size={gutter} />}
          {child}
          </React.Fragment>
      ))}
    </div>
  )
})
