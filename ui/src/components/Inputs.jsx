import _ from 'lodash'
import { forwardRef } from 'react'
import { apply, tw } from 'twind'

const inputStyle = `block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500`

export function Input({
    className,
    onInput=_.noop,
    onInputValue=_.noop,
    onChange=_.noop,
    onChangeValue=_.noop,
    ...props
}) {
    const _onInput = e => {
        onInputValue(e.target.value)
        onInput(e)
    }
    const _onChange = e => {
        onChangeValue(e.target.value)
        onChange(e)
    }

    return <input className={tw(apply(inputStyle, className))} onChange={_onChange} onInput={_onInput} {...props}/>
}


export function Select({
    className,
    onChange = _.noop,
    onChangeValue = _.noop,
    ...props
}) {
    const _onChange = e => {
        onChangeValue(e.target.value)
        onChange(e)
    }

    return <select className={tw(apply(inputStyle, 'cursor-pointer', className))} onChange={_onChange} {...props} />
}


export const TextArea = forwardRef(({
    className,
    onInput = _.noop,
    onInputValue = _.noop,
    onChange = _.noop,
    onChangeValue = _.noop,
    ...props
}, ref) => {
    const _onInput = e => {
        onInputValue(e.target.value)
        onInput(e)
    }
    const _onChange = e => {
        onChangeValue(e.target.value)
        onChange(e)
    }

    return <textarea ref={ref} className={tw(apply(inputStyle, className))} onChange={_onChange} onInput={_onInput} {...props} />
})
