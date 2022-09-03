import { apply, tw } from "twind";
import { Interspaced } from "./Spacer";


export function Row({className, gutter, ...props}) {
  const cls = tw(apply`flex flex-row items-center`, className)
  return gutter
    ? <Interspaced gutter={gutter} className={cls} {...props}/>
    : <div className={cls} {...props}/>
}

export function Col({ className, gutter, ...props }) {
  const cls = tw(apply`flex flex-col items-center`, className)
  return gutter
    ? <Interspaced gutter={gutter} className={cls} {...props} />
    : <div className={cls} {...props} />
}
