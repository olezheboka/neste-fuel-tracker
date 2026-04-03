import * as React from "react"
import { DayPicker } from "react-day-picker"

function Calendar({
  className,
  ...props
}) {
  return (
    <DayPicker
      className={className}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
