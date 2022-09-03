import { forwardRef } from "react";
import { apply, tw } from "twind";
import { Interspaced } from "./Spacer";


export const Row = forwardRef(({className, onMouseLeave, centeredItems, gutter, ...props}, ref) => {
  const cls = tw(apply`flex flex-row items-center`, centeredItems && 'justify-center', className)
  return gutter
    ? <Interspaced gutter={gutter} className={cls} onMouseLeave={onMouseLeave} {...props} />
    : <div className={cls} onMouseLeave={onMouseLeave} {...props}/>
})

export const Col = forwardRef(({ className, gutter, onMouseLeave, centeredItems, ...props }, ref) => {
  const cls = tw(apply`flex flex-col items-center`, centeredItems && 'justify-center', className)
  return gutter
    ? <Interspaced gutter={gutter} className={cls} onMouseLeave={onMouseLeave} {...props} />
    : <div className={cls} onMouseLeave={onMouseLeave} {...props} />
})
