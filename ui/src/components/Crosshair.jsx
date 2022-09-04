import _ from 'lodash'
import { apply, tw } from 'twind'

export function Crosshair({color='yellow', width, height, x, y}) {
    console.log(x, y)
    return (
        <div className={tw(
            apply`w-[${width}px] h-[${height}px] pointer-events-none absolute inset-0`
        )}>
            <div className={tw(apply`absolute bg-${color}-500 opacity-75 top-0 left-[${x}px] w-[1px] h-[${height}px]`)}/>
            <div className={tw(apply`absolute bg-${color}-500 opacity-75 left-0 bottom-[${y}px] h-[1px] w-[${width}px]`)}/>
        </div>
    )
}
