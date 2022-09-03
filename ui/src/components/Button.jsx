import _ from 'lodash'
import { tw } from 'twind'

export default function Button({
  className,
  onChange = _.noop,
  onChangeValue = _.noop,
  ...props
}) {
  const _onChange = e => {
    onChangeValue(e.target.value)
    onChange(e)
  }

  const cls = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
  return <button className={tw(cls, className)} onChange={_onChange} {...props}/>
}
