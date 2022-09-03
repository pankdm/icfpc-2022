import { useEffect, useState } from "react"

export const sleep = (delayMs=100) => new Promise((res, rej) => setTimeout(res, delayMs))

export function useOnChange(value, callback=_.noop) {
    const [prevValue, setPrevValue] = useState(value)
    useEffect(() => {
        if (prevValue === value) return
        setPrevValue(value)
        callback(value, prevValue)
    }, [value])
}
