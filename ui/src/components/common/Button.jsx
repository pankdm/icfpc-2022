import _ from 'lodash'
import { apply, tw } from 'twind'

export default function Button({
  color='blue',
  className,
  onChange = _.noop,
  onChangeValue = _.noop,
  disabled,
  ...props
}) {
  const _onChange = e => {
    onChangeValue(e.target.value)
    onChange(e)
  }

  const cls = [
    apply`bg-${color}-500 hover:bg-${color}-700 text-white font-bold py-2 px-4 rounded`,
    ['white', 'transparent'].includes(color) == 'white' && `bg-${color} hover:bg-${color}`,
    disabled && `opacity-50 bg-${color}-500 hover:bg-${color}-500 pointer-noentry`
  ]
  return <button className={tw(cls, className)} onChange={_onChange} {...props}/>
}
