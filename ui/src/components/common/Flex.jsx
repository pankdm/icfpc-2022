import _ from 'lodash'
import { forwardRef } from "react";
import { apply, tw } from "twind";
import { Interspaced } from "./Spacer";


export const Row = forwardRef(({className, flex, onMouseLeave, centeredItems, gutter, children, ...props}, ref) => {
  const flexGrow = flex && (_.isNumber(flex) ? flex : 1)
  const cls = tw(apply`flex flex-row items-center`, centeredItems && `justify-center`, flex && `flex-grow-${flexGrow}`, className)
  return gutter && children && children.length>0
    ? <Interspaced ref={ref} gutter={gutter} className={cls} onMouseLeave={onMouseLeave} {...props}>{children}</Interspaced>
    : <div ref={ref} className={cls} onMouseLeave={onMouseLeave} {...props}>{children}</div>
})

export const Col = forwardRef(({ className, flex, gutter, onMouseLeave, centeredItems, children, ...props }, ref) => {
  const flexGrow = flex && (_.isNumber(flex) ? flex : 1)
  const cls = tw(apply`flex flex-col items-center`, centeredItems && `justify-center`, flex && `flex-grow-${flexGrow}`, className)
  return gutter && children && children.length>0
    ? <Interspaced ref={ref} gutter={gutter} className={cls} onMouseLeave={onMouseLeave} {...props}>{children}</Interspaced>
    : <div ref={ref} className={cls} onMouseLeave={onMouseLeave} {...props}>{children}</div>
})
