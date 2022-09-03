import _ from 'lodash'
import { apply, tw } from 'twind'

export default function TextArea({
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

    const cls = `block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500`
    return <textarea className={tw(apply(cls, className))} onChange={_onChange} onInput={_onInput} {...props}/>
}
